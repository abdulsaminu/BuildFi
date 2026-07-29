import "dotenv/config";
import express from "express";
import { runRiskCheck } from "./riskCheck";
import { settleViaCircle, getWalletBalance } from "./circleSettle";
import { loadTreasuryState, recordSettlement, computeRecentBurnRate } from "./treasuryStore";

/**
 * Treasury Agent process.
 *
 * Listens for verified-milestone signals from the Inspector Agent
 * (construct-os-v2), running as a separate process/repo. On each signal,
 * the Treasury Agent independently runs a risk check against its own
 * state and DECIDES whether to autonomously settle USDC — this is the
 * agent-to-agent boundary: Inspector Agent approving a milestone does not
 * by itself move any money. Only Treasury Agent's own decision does.
 *
 * Treasury balance is fetched LIVE from Circle on every decision (not
 * tracked/synced locally) so the risk check always gates against the
 * real, current wallet balance — a genuine signal, not a value that
 * could silently drift. Project budget/burn-rate bookkeeping (which
 * Circle has no concept of) lives in a local JSON store — see
 * treasuryStore.ts.
 *
 * Inspector Agent side: after decisionEngine() returns APPROVE in
 * construct-os-v2/agent/index.ts, a fetch call notifies this webhook.
 */

const app = express();
app.use(express.json());

interface VerifiedMilestonePayload {
  milestoneId: string;
  contractorAddress: string;
  amount: number;
}

app.post("/verified-milestone", async (req, res) => {
  const { milestoneId, contractorAddress, amount } = req.body as VerifiedMilestonePayload;

  if (!milestoneId || !contractorAddress || !amount) {
    return res.status(400).json({ error: "milestoneId, contractorAddress, and amount are required" });
  }

  console.log(`[treasury-agent] Received verified milestone ${milestoneId} for ${contractorAddress}, amount ${amount}`);

  let treasuryBalance: number;
  try {
    treasuryBalance = await getWalletBalance();
  } catch (err) {
    console.error(`[treasury-agent] Failed to fetch live balance:`, err instanceof Error ? err.message : err);
    return res.status(200).json({ decision: "HOLD", reason: "Could not verify live treasury balance" });
  }

  const projectState = loadTreasuryState();
  const recentBurnRate = computeRecentBurnRate();

  const risk = runRiskCheck({
    amount,
    treasuryBalance,
    projectBudgetRemaining: projectState.projectBudgetRemaining,
    recentBurnRate,
  });

  console.log(
    `[treasury-agent] Risk check: ${risk.decision} (${risk.riskLevel}) — ${risk.reason} ` +
    `[balance: ${treasuryBalance.toFixed(2)}, budget remaining: ${projectState.projectBudgetRemaining.toFixed(2)}, burn rate: ${recentBurnRate.toFixed(2)}/day]`
  );

  if (risk.decision === "HOLD") {
    return res.status(200).json({ decision: "HOLD", risk });
  }

  const receipt = await settleViaCircle(contractorAddress, amount.toFixed(2));
  console.log(`[treasury-agent] Settlement: ${receipt.status}`, receipt.txHash ?? receipt.reason ?? "");

  if (receipt.status === "confirmed" && receipt.txHash) {
    recordSettlement(milestoneId, contractorAddress, amount, receipt.txHash);
  }

  return res.status(200).json({ decision: "SETTLE", risk, receipt });
});

app.get("/health", async (_req, res) => {
  try {
    const treasuryBalance = await getWalletBalance();
    const projectState = loadTreasuryState();
    res.json({ status: "ok", treasuryBalance, projectState });
  } catch (err) {
    res.status(500).json({ status: "error", reason: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = process.env.TREASURY_AGENT_PORT || 4001;
app.listen(PORT, () => {
  console.log(`Treasury Agent listening on port ${PORT}`);
});
