import "dotenv/config";
import express from "express";
import cors from "cors";
import { runRiskCheck } from "./riskCheck";
import { settleViaCircle, getWalletBalance } from "./circleSettle";
import { settleCrossChain } from "./cctp";
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
app.use(cors());
app.use(express.json());

// Track a small in-memory event log for the frontend's live-flow view.
// This is presentation-layer only — treasuryStore.ts remains the source
// of truth for actual settlement records.
interface FlowEvent {
  id: string;
  milestoneId: string;
  contractorAddress: string;
  amount: number;
  stage: "received" | "risk_checked" | "settled" | "held" | "failed";
  detail: string;
  timestamp: string;
}
const recentEvents: FlowEvent[] = [];
function logEvent(e: Omit<FlowEvent, "id" | "timestamp">) {
  recentEvents.unshift({ ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString() });
  if (recentEvents.length > 50) recentEvents.length = 50;
}

interface VerifiedMilestonePayload {
  milestoneId: string;
  contractorAddress: string;
  amount: number;
  destinationChain?: "sepolia"; // if set, settle via CCTP instead of a same-chain Circle transfer
}

app.post("/verified-milestone", async (req, res) => {
  const { milestoneId, contractorAddress, amount, destinationChain } = req.body as VerifiedMilestonePayload;

  if (!milestoneId || !contractorAddress || !amount) {
    return res.status(400).json({ error: "milestoneId, contractorAddress, and amount are required" });
  }

  console.log(`[treasury-agent] Received verified milestone ${milestoneId} for ${contractorAddress}, amount ${amount}`);
  logEvent({ milestoneId, contractorAddress, amount, stage: "received", detail: "Inspector Agent verified milestone" });

  let treasuryBalance: number;
  try {
    treasuryBalance = await getWalletBalance();
  } catch (err) {
    console.error(`[treasury-agent] Failed to fetch live balance:`, err instanceof Error ? err.message : err);
    logEvent({ milestoneId, contractorAddress, amount, stage: "failed", detail: "Could not verify live treasury balance" });
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
  logEvent({ milestoneId, contractorAddress, amount, stage: "risk_checked", detail: `${risk.decision}: ${risk.reason}` });

  if (risk.decision === "HOLD") {
    logEvent({ milestoneId, contractorAddress, amount, stage: "held", detail: risk.reason });
    return res.status(200).json({ decision: "HOLD", risk });
  }

  if (destinationChain === "sepolia") {
    logEvent({ milestoneId, contractorAddress, amount, stage: "risk_checked", detail: `${risk.decision}: settling cross-chain via CCTP to Sepolia` });
    const { burn, mint } = await settleCrossChain(amount.toFixed(2), contractorAddress);
    console.log(`[treasury-agent] CCTP burn:`, burn.status, burn.txHash ?? burn.reason ?? "");
    if (mint) console.log(`[treasury-agent] CCTP mint:`, mint.status, mint.txHash ?? mint.reason ?? "");

    if (burn.status === "confirmed" && mint?.status === "confirmed" && mint.txHash) {
      recordSettlement(milestoneId, contractorAddress, amount, mint.txHash);
      logEvent({ milestoneId, contractorAddress, amount, stage: "settled", detail: mint.txHash });
    } else {
      logEvent({ milestoneId, contractorAddress, amount, stage: "failed", detail: mint?.reason || burn.reason || "CCTP settlement failed" });
    }
    return res.status(200).json({ decision: "SETTLE", risk, cctp: { burn, mint } });
  }

  const receipt = await settleViaCircle(contractorAddress, amount.toFixed(2));
  console.log(`[treasury-agent] Settlement: ${receipt.status}`, receipt.txHash ?? receipt.reason ?? "");

  if (receipt.status === "confirmed" && receipt.txHash) {
    recordSettlement(milestoneId, contractorAddress, amount, receipt.txHash);
    logEvent({ milestoneId, contractorAddress, amount, stage: "settled", detail: receipt.txHash });
  } else {
    logEvent({ milestoneId, contractorAddress, amount, stage: "failed", detail: receipt.reason || "Settlement failed" });
  }

  return res.status(200).json({ decision: "SETTLE", risk, receipt });
});

// --- DEMO ENDPOINT FOR HACKATHON JUDGES ---
// Simulates the Inspector Agent verifying a milestone and sending the webhook.
// Allows judges to test the full autonomous settlement flow directly from the UI.
app.post("/demo/verify", async (_req, res) => {
  try {
    const milestoneId = "0x" + Math.random().toString(16).slice(2, 66).padEnd(64, "0");
    const contractorAddress = "0xFFD3347ca0C3Ba5a104Ed9113C1d7F65d0C85a8A"; // Test contractor
    const amount = 1.00; // Keep it small so the treasury lasts a long time

    console.log(`[treasury-agent] DEMO MODE: Received simulated milestone ${milestoneId} for ${contractorAddress}, amount ${amount}`);
    logEvent({ milestoneId, contractorAddress, amount, stage: "received", detail: "Inspector Agent verified milestone (Demo)" });

    // 1. Fetch live balance
    let treasuryBalance: number;
    try {
      treasuryBalance = await getWalletBalance();
    } catch (err) {
      console.error(`[treasury-agent] Failed to fetch live balance:`, err instanceof Error ? err.message : err);
      logEvent({ milestoneId, contractorAddress, amount, stage: "failed", detail: "Could not verify live treasury balance" });
      return res.status(200).json({ decision: "HOLD", reason: "Could not verify live treasury balance" });
    }

    // 2. Run risk check
    const projectState = loadTreasuryState();
    const recentBurnRate = computeRecentBurnRate();
    const risk = runRiskCheck({
      amount,
      treasuryBalance,
      projectBudgetRemaining: projectState.projectBudgetRemaining,
      recentBurnRate,
    });

    console.log(
      `[treasury-agent] DEMO Risk check: ${risk.decision} (${risk.riskLevel}) — ${risk.reason} ` +
      `[balance: ${treasuryBalance.toFixed(2)}, budget remaining: ${projectState.projectBudgetRemaining.toFixed(2)}]`
    );
    logEvent({ milestoneId, contractorAddress, amount, stage: "risk_checked", detail: `${risk.decision}: ${risk.reason}` });

    if (risk.decision === "HOLD") {
      logEvent({ milestoneId, contractorAddress, amount, stage: "held", detail: risk.reason });
      return res.status(200).json({ decision: "HOLD", risk });
    }

    // 3. Execute settlement via Circle
    const receipt = await settleViaCircle(contractorAddress, amount.toFixed(2));
    console.log(`[treasury-agent] DEMO Settlement: ${receipt.status}`, receipt.txHash ?? receipt.reason ?? "");

    if (receipt.status === "confirmed" && receipt.txHash) {
      recordSettlement(milestoneId, contractorAddress, amount, receipt.txHash);
      logEvent({ milestoneId, contractorAddress, amount, stage: "settled", detail: receipt.txHash });
    } else {
      logEvent({ milestoneId, contractorAddress, amount, stage: "failed", detail: receipt.reason || "Settlement failed" });
    }

    return res.status(200).json({ decision: "SETTLE", risk, receipt });
  } catch (err) {
    console.error("[treasury-agent] Demo endpoint error:", err);
    return res.status(500).json({ error: "Demo failed" });
  }
});
// --- END DEMO ENDPOINT ---

app.get("/activity", (_req, res) => {
  res.json({ events: recentEvents });
});

app.get("/agents", (_req, res) => {
  res.json({
    agents: [
      {
        name: "Inspector Agent",
        role: "inspector",
        address: process.env.INSPECTOR_AGENT_ADDRESS || null,
        registrationTx: "0x6aa9222e28e66307fb5a99154e0738587c69b2c679f0a6bfa3cc85b7257bc2c7",
      },
      {
        name: "Treasury Agent",
        role: "treasury",
        address: process.env.TREASURY_AGENT_ADDRESS || null,
        registrationTx: "0x6fd008c97c2699044e10a42f8d9091ebc46a825c33cdc5fc75e252e1323e4d30",
      },
    ],
  });
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