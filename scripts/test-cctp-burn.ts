import "dotenv/config";
import { burnOnArc } from "../agent/cctp";

/**
 * Isolated test for the CCTP burn leg only. Run this BEFORE wiring CCTP
 * into Treasury Agent's real flow — it's the step most likely to reveal
 * whether createContractExecutionTransaction's parameter shape matches
 * the installed Circle SDK version.
 *
 * Usage:
 *   npx tsx scripts/test-cctp-burn.ts <amountUsdc> <destinationAddress>
 *
 * Example:
 *   npx tsx scripts/test-cctp-burn.ts 1.00 0xYourTestAddressOnSepolia
 */

async function main() {
  const [amount, destination] = process.argv.slice(2);

  if (!amount || !destination) {
    console.error("Usage: npx tsx scripts/test-cctp-burn.ts <amountUsdc> <destinationAddress>");
    process.exit(1);
  }

  console.log(`Testing CCTP burn: ${amount} USDC -> ${destination} on Sepolia`);
  console.log("This will call approve() then depositForBurn() on Arc Testnet via Circle's contract-execution API.\n");

  const result = await burnOnArc(amount, destination);

  console.log("\nResult:", result);

  if (result.status === "confirmed") {
    console.log(`\n✅ Burn confirmed. txHash: ${result.txHash}`);
    console.log(`Verify on explorer: https://testnet.arcscan.app/tx/${result.txHash}`);
    console.log(`\nNext: run scripts/test-cctp-mint.ts with this txHash once Iris has attested it (usually 1-3 min).`);
  } else {
    console.log(`\n❌ Burn failed: ${result.reason}`);
    console.log(`If this is a parameter/ABI error, check the exact createContractExecutionTransaction shape against your installed SDK's type definitions:`);
    console.log(`  node -e "console.log(require('@circle-fin/developer-controlled-wallets'))"`);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
