import { useEffect, useState, useCallback } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_TREASURY_AGENT_URL || "http://localhost:4001";
const EXPLORER_TX = "https://testnet.arcscan.app/tx/";

// --- Icons ---
const Icon = ({ path, className = "icon" }: { path: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const Icons = {
  Overview: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  CheckCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  Shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  Robot: "M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M15 13v2M9 13v2",
  Coins: "M8 14a6 6 0 0 0 12 0v-4a6 6 0 0 0-12 0zM15 13v2M9 13v2M11 6h7M11 9h7M8 14H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h3",
  Activity: "M22 12h-4l-3 9L9 3l-3 9H2",
};

// --- Types ---
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

// --- Helpers ---
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

// --- Reusable Components ---
const DashboardCard = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => (
  <div className={`card ${className}`}>
    {title && <div className="card-header">{title}</div>}
    <div className="card-body">{children}</div>
  </div>
);

const TimelineEvent = ({ event }: { event: FlowEvent }) => (
  <div className={`timeline-event ${event.stage}`}>
    <div className="timeline-marker">
      <Icon path={event.stage === "settled" ? Icons.CheckCircle : event.stage === "failed" ? Icons.Shield : Icons.Activity} />
    </div>
    <div className="timeline-content">
      <div className="timeline-top">
        <span className={`timeline-tag ${event.stage}`}>{STAGE_LABEL[event.stage]}</span>
        <span className="timeline-time mono">{timeAgo(event.timestamp)}</span>
      </div>
      <div className="timeline-detail">{event.detail}</div>
      <div className="timeline-sub mono">
        Milestone {event.milestoneId.slice(0, 10)}… · {shortAddr(event.contractorAddress)} · {event.amount} USDC
        {event.stage === "settled" && event.detail.startsWith("0x") && (
          <>
            {" · "}
            <a href={`${EXPLORER_TX}${event.detail}`} target="_blank" rel="noreferrer" className="timeline-link">
              View TX ↗
            </a>
          </>
        )}
      </div>
    </div>
  </div>
);

// --- Main App ---
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

  const totalSettlements = health?.projectState.settlements.length || 0;
  const treasuryStatus = budgetPct > 20 ? "Healthy" : "Warning";

  return (
    <div className="app-layout">
      {/* Minimal Icon Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="BuildFi Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-item active">
            <Icon path={Icons.Overview} className="sidebar-icon" />
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="tech-label">Powered by</div>
          <div className="tech-value">Arc • Circle</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="header-brand">
            <h1 className="brand-title">BuildFi</h1>
            <p className="tagline">Programmable Finance Infrastructure for Construction</p>
            <p className="subhead">Autonomous agent-to-agent USDC settlement on Arc</p>
          </div>
          <div className={`status-pill ${connected ? "live" : "offline"}`}>
            <span className="dot" />
            {connected ? "Treasury Agent Live" : "Connecting…"}
          </div>
        </header>

        <div className="pipeline-strip">
          <div className="pipeline-step"><Icon path={Icons.Shield} /> <span>1. Verify Milestone</span></div>
          <div className="pipeline-connector"></div>
          <div className="pipeline-step"><Icon path={Icons.Robot} /> <span>2. Risk Evaluation</span></div>
          <div className="pipeline-connector"></div>
          <div className="pipeline-step"><Icon path={Icons.Coins} /> <span>3. Autonomous Settlement</span></div>
        </div>

        {/* Main Grid - Timeline Promoted to Centerpiece */}
        <div className="dashboard-grid">
          <div className="left-col">
            <DashboardCard title="Live Activity Timeline">
              <div className="timeline-header">
                <span>Real-time autonomous settlement flow</span>
                <span className="settlement-count">{totalSettlements} Total Settlements</span>
              </div>
              <div className="timeline-container">
                {events.length === 0 ? (
                  <div className="empty-hint">No milestones processed yet. Submit one to see the flow live.</div>
                ) : (
                  events.map((e) => <TimelineEvent key={e.id} event={e} />)
                )}
              </div>
            </DashboardCard>
          </div>

          <div className="right-col">
            <DashboardCard title="Treasury Overview">
              <div className="treasury-balance">
                <span className="big-number">
                  {health ? health.treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                </span>
                <span className="unit">USDC</span>
              </div>
              <div className="budget-row">
                <span>Budget Remaining</span>
                <span>{health ? health.projectState.projectBudgetRemaining.toLocaleString() : "—"} USDC</span>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="budget-caption">
                <span>Budget Utilization</span>
                <span>{100 - budgetPct}%</span>
              </div>
              <div className="health-badge-wrapper">
                <span className={`status-badge ${treasuryStatus.toLowerCase()}`}>{treasuryStatus}</span>
              </div>
            </DashboardCard>

            <DashboardCard title="AI Treasury Agent">
              <div className="ai-agent-status">
                <Icon path={Icons.Robot} className="ai-icon" />
                <div>
                  <div className="ai-title">Treasury Agent</div>
                  <div className="ai-subtitle">Autonomous Risk & Settlement</div>
                </div>
                <div className={`status-badge ${connected ? "healthy" : "warning"}`}>{connected ? "Operational" : "Offline"}</div>
              </div>
              <div className="ai-metrics">
                <div className="detail-row">
                  <span className="detail-label">Network</span>
                  <span className="detail-value">Arc Testnet</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Risk Level</span>
                  <span className="detail-value">Low</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Activity</span>
                  <span className="detail-value">Monitoring Webhook</span>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Registered Agents">
              <div className="agents-list">
                {agents.length === 0 ? (
                  <div className="empty-hint">Waiting for agents…</div>
                ) : (
                  agents.map((a) => (
                    <div key={a.role} className="agent-card-mini">
                      <div className="agent-header">
                        <div className="agent-icon-wrapper">
                          <Icon path={a.role === "treasury" ? Icons.Coins : Icons.Robot} className="agent-icon" />
                        </div>
                        <div>
                          <div className="agent-name">{a.name}</div>
                          <div className="agent-role">{a.role}</div>
                        </div>
                      </div>
                      <div className="agent-details">
                        <div className="detail-row">
                          <span className="detail-label">Address</span>
                          <span className="detail-value mono">{shortAddr(a.address)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Identity TX</span>
                          <a href={`${EXPLORER_TX}${a.registrationTx}`} target="_blank" rel="noreferrer" className="detail-link">View ↗</a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>
          </div>
        </div>

        <footer className="app-footer">
          Powered by Arc • Circle Developer-Controlled Wallets • ERC-8004 Agent Identity • CCTP V2
        </footer>
      </main>
    </div>
  );
}

export default App;