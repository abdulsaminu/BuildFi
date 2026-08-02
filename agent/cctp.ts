import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

/**
 * Cross-chain USDC settlement via CCTP V2, using Circle's Developer-
 * Controlled Wallets contract-execution API for BOTH legs (burn on Arc,
 * mint on destination) — keeping one custody model consistent with the
 * rest of Treasury Agent, rather than adopting Circle's reference repo's
 * raw-private-key/viem pattern (see circle-cctp-fulfiller-repayment).
 *
 * SIMPLIFIED FLOW vs. Circle's reference app: this does a DIRECT burn ->
 * mint straight to the destination recipient's address. It does not
 * implement the fulfiller/repayment-escrow pattern (instant payment
 * before attestation finality) — that solves a problem BuildFi doesn't
 * have yet. Same underlying CCTP mechanics, less unnecessary machinery.
 *
 * Confirmed contract addresses/domains (Arc Testnet -> Ethereum Sepolia
 * corridor), pulled directly from Circle's own reference implementation
 * source (github.com/circlefin/circle-cctp-fulfiller-repayment):
 *   tokenMessengerV2:     0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA
 *   messageTransmitterV2: 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275
 *   ARC_DOMAIN: 26, SEPOLIA_DOMAIN: 0
 *
 * UNVERIFIED: the exact createContractExecutionTransaction parameter
 * shape below follows Circle's documented pattern, but has NOT been
 * test-run against the installed SDK version. Test with a tiny amount
 * (e.g. 1 USDC) before using this for anything real — the same
 * discipline that caught the amount/amounts quirk in circleSettle.ts.
 */

const TOKEN_MESSENGER_V2 = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
const MESSAGE_TRANSMITTER_V2 = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
const ARC_DOMAIN = 26;
const SEPOLIA_DOMAIN = 0;
const IRIS_API_URL = "https://iris-api-sandbox.circle.com";
const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

function addressToBytes32(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
}

export interface CctpBurnResult {
  status: "confirmed" | "failed";
  txHash?: string;
  reason?: string;
}

export interface CctpMintResult {
  status: "confirmed" | "failed";
  txHash?: string;
  reason?: string;
}

/**
 * Step 1: approve + depositForBurn on Arc, via Treasury Agent's existing
 * Circle-managed wallet.
 */
export async function burnOnArc(
  amountUsdc: string, // decimal string, e.g. "5.00"
  destinationRecipientAddress: string,
): Promise<CctpBurnResult> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletId = process.env.TREASURY_WALLET_ID;
  const usdcContractAddress = process.env.ARC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

  if (!apiKey || !entitySecret || !walletId) {
    return { status: "failed", reason: "Missing Circle env vars for CCTP burn" };
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  const amountUnits = BigInt(Math.round(parseFloat(amountUsdc) * 1_000_000)); // USDC = 6 decimals

  try {
    // 1a. Approve TokenMessengerV2 to pull USDC
    const approveTx = await client.createContractExecutionTransaction({
      walletId,
      contractAddress: usdcContractAddress,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [TOKEN_MESSENGER_V2, amountUnits.toString()],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    await pollTransaction(client, approveTx.data?.id);

    // 1b. depositForBurn — mint recipient is the supplier's address on Sepolia directly
    const burnTx = await client.createContractExecutionTransaction({
      walletId,
      contractAddress: TOKEN_MESSENGER_V2,
      abiFunctionSignature:
        "depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)",
      abiParameters: [
        amountUnits.toString(),
        SEPOLIA_DOMAIN,
        addressToBytes32(destinationRecipientAddress),
        usdcContractAddress,
        ZERO_BYTES32,
        "0", // maxFee — 0 for standard (slower, cheaper) transfer; see quoteBurn pattern in Circle's reference for fee-market pricing
        "2000", // minFinalityThreshold — FINALIZED (2000) for standard transfer, safer than CONFIRMED (1000) for a first test
      ],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    const receipt = await pollTransaction(client, burnTx.data?.id);
    return { status: "confirmed", txHash: receipt.txHash };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Step 2: poll Iris for the attested burn message.
 */
export async function fetchAttestation(
  sourceTxHash: string,
  maxAttempts = 20,
  intervalMs = 5000,
): Promise<{ message: string; attestation: string } | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${IRIS_API_URL}/v2/messages/${ARC_DOMAIN}?transactionHash=${sourceTxHash}`);
    if (res.ok) {
      const json = await res.json();
      const first = json.messages?.[0];
      if (first?.message && first?.attestation && first.attestation !== "PENDING") {
        return { message: first.message, attestation: first.attestation };
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

/**
 * Step 3: receiveMessage on Sepolia, via a SEPARATE Circle-managed
 * wallet on the destination chain (Circle wallets are chain-specific —
 * Treasury Agent's existing Arc wallet cannot also sign on Sepolia).
 * Requires SEPOLIA_WALLET_ID to be set once that wallet is created.
 */
export async function mintOnDestination(
  message: string,
  attestation: string,
): Promise<CctpMintResult> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const sepoliaWalletId = process.env.SEPOLIA_WALLET_ID;

  if (!apiKey || !entitySecret || !sepoliaWalletId) {
    return { status: "failed", reason: "Missing Circle env vars for CCTP mint (need SEPOLIA_WALLET_ID)" };
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  try {
    const mintTx = await client.createContractExecutionTransaction({
      walletId: sepoliaWalletId,
      contractAddress: MESSAGE_TRANSMITTER_V2,
      abiFunctionSignature: "receiveMessage(bytes,bytes)",
      abiParameters: [message, attestation],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    const receipt = await pollTransaction(client, mintTx.data?.id);
    return { status: "confirmed", txHash: receipt.txHash };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
}

async function pollTransaction(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string | undefined,
  maxAttempts = 20,
  intervalMs = 3000,
): Promise<{ txHash?: string }> {
  if (!txId) throw new Error("No transaction id returned from Circle");
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await client.getTransaction({ id: txId });
    const state = status.data?.transaction?.state;
    if (state === "CONFIRMED" || state === "COMPLETE") {
      return { txHash: status.data?.transaction?.txHash };
    }
    if (state === "FAILED" || state === "CANCELLED") {
      throw new Error(`Circle transaction ${state}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Transaction still pending after poll window");
}

/**
 * Full orchestration: burn on Arc -> wait for attestation -> mint on Sepolia.
 */
export async function settleCrossChain(
  amountUsdc: string,
  destinationRecipientAddress: string,
): Promise<{ burn: CctpBurnResult; mint?: CctpMintResult }> {
  const burn = await burnOnArc(amountUsdc, destinationRecipientAddress);
  if (burn.status !== "confirmed" || !burn.txHash) {
    return { burn };
  }

  const attestation = await fetchAttestation(burn.txHash);
  if (!attestation) {
    return { burn, mint: { status: "failed", reason: "Attestation not available after poll window" } };
  }

  const mint = await mintOnDestination(attestation.message, attestation.attestation);
  return { burn, mint };
}
