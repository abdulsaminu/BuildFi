import { useEffect, useState, useCallback } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_TREASURY_AGENT_URL || "http://localhost:4001";
const EXPLORER_TX = "https://testnet.arcscan.app/tx/";

interface FlowEvent {
  id: string;
  milestoneId: string;
  contractorAddress: string;
  amount: number;
  stage: "received" | "risk_checked" | "settled" | "held" | "failed";
  detail: string;
  timestamp: string;
}

interface AgentInfo {
  name: string;
  role: string;
  address: string | null;
  registrationTx: string;
}

interface TreasuryHealth {
  treasuryBalance: number;
  projectState: {
    projectBudgetTotal: number;
    projectBudgetRemaining: number;
    settlements: Array<{ milestoneId: string; amount: number; txHash: string; settledAt: string }>;
  };
}

const STAGE_LABEL: Record<FlowEvent["stage"], string> = {
  received: "VERIFIED",
  risk_checked: "RISK CHECK",
  settled: "SETTLED",
  held: "HELD",
  failed: "FAILED",
};

function shortAddr(a: string | null) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function App() {
  const [health, setHealth] = useState<TreasuryHealth | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const poll = useCallback(async () => {
    try {
      const [h, a, ev] = await Promise.all([
        fetch(`${API_BASE}/health`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`/health ${r.status}`)))),
        fetch(`${API_BASE}/agents`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`/agents ${r.status}`)))),
        fetch(`${API_BASE}/activity`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`/activity ${r.status}`)))),
      ]);
      setHealth(h);
      setAgents(a.agents);
      setEvents(ev.events);
      setConnected(true);
    } catch (err) {
      console.warn("[buildfi] poll failed:", err);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  const budgetPct = health?.projectState
    ? Math.round((health.projectState.projectBudgetRemaining / health.projectState.projectBudgetTotal) * 100)
    : 0;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand-container">
          <div className="logo-wrapper">
            <img src="/logo.png" alt="BuildFi Logo" />
          </div>
          <div className="wordmark">
            Build<span className="accent">Fi</span>
          </div>
        </div>
        <div className={`status-pill ${connected ? "live" : "offline"}`}>
          <span className="dot" />
          {connected ? "Treasury Agent live" : "Connecting…"}
        </div>
      </header>

      <p className="subhead">Autonomous agent-to-agent USDC settlement on Arc</p>

      <div className="grid">
        <section className="panel treasury">
          <div className="panel-label">Treasury</div>
          <div className="big-number">
            {health ? health.treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
            <span className="unit">USDC</span>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${budgetPct}%` }} />
          </div>
          <div className="meter-caption">
            <span>{health ? health.projectState.projectBudgetRemaining.toLocaleString() : "—"} budget remaining</span>
            <span>{budgetPct}%</span>
          </div>
        </section>

        <section className="panel agents">
          <div className="panel-label">Registered agents</div>
          {agents.map((a) => (
            <div className="agent-row" key={a.role}>
              <div className={`agent-dot ${a.role}`} />
              <div className="agent-meta">
                <div className="agent-name">{a.name}</div>
                <div className="agent-addr mono">{shortAddr(a.address)}</div>
              </div>
              <a className="agent-link" href={`${EXPLORER_TX}${a.registrationTx}`} target="_blank" rel="noreferrer">
                identity tx ↗
              </a>
            </div>
          ))}
          {agents.length === 0 && <div className="empty-hint">Waiting for Treasury Agent…</div>}
        </section>

        <section className="panel ledger">
          <div className="panel-label">Live flow</div>
          {events.length === 0 && (
            <div className="empty-hint">No milestones processed yet. Submit one to see the flow live.</div>
          )}
          <div className="ledger-list">
            {events.map((e) => (
              <div className={`ledger-row stage-${e.stage}`} key={e.id}>
                <div className="ledger-tag mono">[{STAGE_LABEL[e.stage]}]</div>
                <div className="ledger-body">
                  <div className="ledger-detail">{e.detail}</div>
                  <div className="ledger-sub mono">
                    milestone {e.milestoneId.slice(0, 10)}… · {shortAddr(e.contractorAddress)} · {e.amount} USDC
                    {e.stage === "settled" && e.detail.startsWith("0x") && (
                      <>
                        {" · "}
                        <a href={`${EXPLORER_TX}${e.detail}`} target="_blank" rel="noreferrer">
                          view tx ↗
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="ledger-time mono">{timeAgo(e.timestamp)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="foot">
        Inspector Agent verifies → Treasury Agent risk-checks → USDC settles on Arc Testnet — autonomously.
      </footer>
    </div>
  );
}

export default App;