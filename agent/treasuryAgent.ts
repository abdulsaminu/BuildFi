import express from "express";
import { runRiskCheck } from "./riskCheck";
import { settleViaCircle } from "./circleSettle";

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
 * Inspector Agent side: after decisionEngine() returns APPROVE in
 * construct-os-v2/agent/index.ts, add a fetch call to this webhook,
 * e.g.:
 *
 *   await fetch(`${TREASURY_AGENT_URL}/verified-milestone`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({
 *       milestoneId: proof.milestoneId,
 *       contractorAddress: proof.contractorAgent,
 *       amount: milestoneAmount, // USDC decimal string
 *     }),
 *   });
 */

const app = express();
app.use(express.json());

// TODO(Phase 3): replace with real treasury/project state (CFEL reducer or
// a simple in-memory/DB store). Hardcoded for now so the decision loop is
// demoable end-to-end before wiring full treasury state.
const TREASURY_STATE = {
  treasuryBalance: 245680.5,
  projectBudgetRemaining: 90000,
  recentBurnRate: 8230,
};

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

  const risk = runRiskCheck({
    amount,
    treasuryBalance: TREASURY_STATE.treasuryBalance,
    projectBudgetRemaining: TREASURY_STATE.projectBudgetRemaining,
    recentBurnRate: TREASURY_STATE.recentBurnRate,
  });

  console.log(`[treasury-agent] Risk check: ${risk.decision} (${risk.riskLevel}) — ${risk.reason}`);

  if (risk.decision === "HOLD") {
    return res.status(200).json({ decision: "HOLD", risk });
  }

  const receipt = await settleViaCircle(contractorAddress, amount.toFixed(2));
  console.log(`[treasury-agent] Settlement: ${receipt.status}`, receipt.txHash ?? receipt.reason ?? "");

  if (receipt.status === "confirmed") {
    TREASURY_STATE.treasuryBalance -= amount;
    TREASURY_STATE.projectBudgetRemaining -= amount;
  }

  return res.status(200).json({ decision: "SETTLE", risk, receipt });
});

app.get("/health", (_req, res) => res.json({ status: "ok", treasury: TREASURY_STATE }));

const PORT = process.env.TREASURY_AGENT_PORT || 4001;
app.listen(PORT, () => {
  console.log(`Treasury Agent listening on port ${PORT}`);
});
