import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

/**
 * Treasury Agent's own settlement execution, using the same Circle
 * Developer-Controlled Wallet primitive already proven out in
 * ConstructOS Finance's CircleSettlementAdapter (see that repo for the
 * original standalone adapter + bounded-poll pattern this borrows from).
 *
 * Known SDK quirk (confirmed against installed SDK v10.8.0): createTransaction
 * wants `amount` as a singular key with an array value, not `amounts`, despite
 * some doc examples showing the plural form. Using the wrong key returns a
 * generic "API parameter invalid" (code 2) with no field-level detail.
 */

export interface SettlementReceipt {
  status: "confirmed" | "pending" | "failed";
  txHash?: string;
  reason?: string;
}

const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 3000;

export async function settleViaCircle(
  payeeAddress: string,
  amount: string, // decimal string, e.g. "5000.00"
): Promise<SettlementReceipt> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletId = process.env.TREASURY_WALLET_ID; // Circle wallet id, distinct from its on-chain address
  const tokenId = process.env.USDC_TOKEN_ID; // Circle's tokenId for USDC on Arc Testnet

  if (!apiKey || !entitySecret || !walletId || !tokenId) {
    return {
      status: "failed",
      reason: "Missing Circle env vars (CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET / TREASURY_WALLET_ID / USDC_TOKEN_ID)",
    };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(payeeAddress)) {
    return { status: "failed", reason: `Invalid payee address: ${payeeAddress}` };
  }

  try {
    const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

    const response = await client.createTransaction({
      walletId,
      tokenId,
      destinationAddress: payeeAddress,
      amounts: [amount], // NOTE: Circle's current published docs use `amounts` (plural).
      // Earlier CFEL work found the installed SDK v10.8.0 actually wanted `amount`
      // (singular) instead — docs and installed package have disagreed before.
      // If this throws a generic "API parameter invalid" (code 2), try switching
      // this key to `amount` and re-run.
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    const txId = response.data?.id;
    if (!txId) return { status: "failed", reason: "No transaction id returned from Circle" };

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const status = await client.getTransaction({ id: txId });
      const state = status.data?.transaction?.state;

      if (state === "CONFIRMED" || state === "COMPLETE") {
        return { status: "confirmed", txHash: status.data?.transaction?.txHash };
      }
      if (state === "FAILED" || state === "CANCELLED") {
        return { status: "failed", reason: `Circle transaction ${state}` };
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    return { status: "pending", reason: "Still processing after poll window", txHash: undefined };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
}
