import "dotenv/config";
import { fetchAttestation, mintOnDestination } from "../agent/cctp";

/**
 * Isolated test for attestation polling + destination mint, given a
 * burn tx hash from test-cctp-burn.ts. Run this second, once the burn
 * is confirmed.
 *
 * Usage:
 *   npx tsx scripts/test-cctp-mint.ts <sourceTxHash>
 */

async function main() {
  const [sourceTxHash] = process.argv.slice(2);

  if (!sourceTxHash) {
    console.error("Usage: npx tsx scripts/test-cctp-mint.ts <sourceTxHash>");
    process.exit(1);
  }

  console.log(`Polling Iris for attestation of ${sourceTxHash}...`);
  console.log("This can take 1-3 minutes for standard (non-fast) transfers.\n");

  const attestation = await fetchAttestation(sourceTxHash);

  if (!attestation) {
    console.log("❌ No attestation received after poll window. Try again in a minute, or check the tx confirmed on Arc first.");
    process.exit(1);
  }

  console.log("✅ Attestation received. Submitting mint on Sepolia...\n");

  const result = await mintOnDestination(attestation.message, attestation.attestation);

  console.log("\nResult:", result);

  if (result.status === "confirmed") {
    console.log(`\n✅ Mint confirmed. txHash: ${result.txHash}`);
    console.log(`Verify on explorer: https://sepolia.etherscan.io/tx/${result.txHash}`);
    console.log(`\nFull cross-chain settlement complete: Arc -> Sepolia via CCTP V2.`);
  } else {
    console.log(`\n❌ Mint failed: ${result.reason}`);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
