import fs from "fs";
import path from "path";

/**
 * Simple JSON-file-backed store for project-level treasury bookkeeping
 * (budget remaining, burn rate, settlement history). This is the part
 * Circle has no concept of — it's ours to track. Real wallet BALANCE is
 * NOT stored here; that's fetched live from Circle each time a decision
 * is made (see circleSettle.ts's getWalletBalance), so the risk check
 * always gates against the actual on-chain-backed number, not a value
 * that could silently drift out of sync.
 */

const STORE_PATH = path.join(__dirname, "..", "data", "treasury-state.json");

export interface TreasuryProjectState {
  projectBudgetTotal: number;
  projectBudgetRemaining: number;
  settlements: Array<{
    milestoneId: string;
    contractorAddress: string;
    amount: number;
    txHash: string;
    settledAt: string;
  }>;
}

const DEFAULT_STATE: TreasuryProjectState = {
  projectBudgetTotal: 90000,
  projectBudgetRemaining: 90000,
  settlements: [],
};

function ensureStoreDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadTreasuryState(): TreasuryProjectState {
  ensureStoreDir();
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STATE, null, 2));
    return { ...DEFAULT_STATE };
  }
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  return JSON.parse(raw) as TreasuryProjectState;
}

export function recordSettlement(
  milestoneId: string,
  contractorAddress: string,
  amount: number,
  txHash: string,
): TreasuryProjectState {
  const state = loadTreasuryState();
  state.projectBudgetRemaining = Math.max(0, state.projectBudgetRemaining - amount);
  state.settlements.push({
    milestoneId,
    contractorAddress,
    amount,
    txHash,
    settledAt: new Date().toISOString(),
  });
  ensureStoreDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
  return state;
}

/**
 * Recent burn rate: total settled amount over the last N days / N.
 * Falls back to 0 if there's no settlement history yet (a fresh project
 * shouldn't be penalized by an arbitrary placeholder burn rate).
 */
export function computeRecentBurnRate(days = 7): number {
  const state = loadTreasuryState();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentTotal = state.settlements
    .filter((s) => new Date(s.settledAt).getTime() >= cutoff)
    .reduce((sum, s) => sum + s.amount, 0);
  return recentTotal / days;
}
