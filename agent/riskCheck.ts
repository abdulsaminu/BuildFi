/**
 * Minimal risk check the Treasury Agent runs before autonomously settling.
 * This is what makes settlement a genuine agent decision rather than a
 * pass-through: the agent can refuse or flag a payment even after the
 * Inspector Agent approved the milestone, if treasury risk signals say no.
 *
 * Deliberately simple for the hackathon window — real signals (treasury
 * balance, project budget, burn rate), not a placeholder that always
 * returns true. Extend with CFEL's fuller reducer state once wired in.
 */

export interface RiskCheckInput {
  amount: number;          // USDC amount requested for this milestone
  treasuryBalance: number;  // current USDC balance available to Treasury Agent
  projectBudgetRemaining: number; // remaining budget for the project this milestone belongs to
  recentBurnRate: number;   // USDC/day spent recently, for overrun forecasting
}

export interface RiskCheckResult {
  decision: "SETTLE" | "HOLD";
  reason: string;
  riskLevel: "low" | "medium" | "high";
}

const MAX_SINGLE_PAYMENT_RATIO = 0.5; // refuse if one payment would drain >50% of treasury
const BUDGET_OVERRUN_BUFFER = 1.0;    // refuse if payment would exceed remaining project budget

export function runRiskCheck(input: RiskCheckInput): RiskCheckResult {
  const { amount, treasuryBalance, projectBudgetRemaining } = input;

  if (amount > treasuryBalance) {
    return { decision: "HOLD", reason: "Insufficient treasury balance", riskLevel: "high" };
  }

  if (amount > projectBudgetRemaining * BUDGET_OVERRUN_BUFFER) {
    return { decision: "HOLD", reason: "Payment would exceed remaining project budget", riskLevel: "high" };
  }

  const drainRatio = amount / treasuryBalance;
  if (drainRatio > MAX_SINGLE_PAYMENT_RATIO) {
    return {
      decision: "HOLD",
      reason: `Single payment would drain ${(drainRatio * 100).toFixed(0)}% of treasury`,
      riskLevel: "medium",
    };
  }

  const riskLevel = drainRatio > 0.25 ? "medium" : "low";
  return { decision: "SETTLE", reason: "Within budget and treasury limits", riskLevel };
}
