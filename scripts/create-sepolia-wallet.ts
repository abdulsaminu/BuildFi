import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

/**
 * Creates a second developer-controlled wallet, on Ethereum Sepolia,
 * within the SAME wallet set as the existing Arc Treasury wallet — so
 * it shares the same entity secret rather than provisioning a whole new
 * wallet set. Needed because Circle wallets are chain-specific: the Arc
 * wallet can't sign on Sepolia.
 *
 * Usage: npx tsx scripts/create-sepolia-wallet.ts
 */

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID; // existing set, e.g. 14b32ac9-...

  if (!apiKey || !entitySecret || !walletSetId) {
    console.error("Missing CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET / CIRCLE_WALLET_SET_ID in .env");
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  const walletResponse = await client.createWallets({
    walletSetId,
    blockchains: ["ETH-SEPOLIA"],
    count: 1,
    accountType: "EOA",
  });

  console.log("Wallet response:", JSON.stringify(walletResponse.data, null, 2));

  const wallet = walletResponse.data?.wallets?.[0];
  if (wallet) {
    console.log(`\n✅ Created Sepolia wallet:`);
    console.log(`   Wallet ID: ${wallet.id}`);
    console.log(`   Address:   ${wallet.address}`);
    console.log(`\nAdd to .env:`);
    console.log(`   SEPOLIA_WALLET_ID=${wallet.id}`);
    console.log(`\nThen fund ${wallet.address} with Sepolia ETH from a faucet (e.g. sepoliafaucet.com) for gas.`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
