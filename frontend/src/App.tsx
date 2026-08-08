import { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_TREASURY_AGENT_URL || "http://localhost:4001";
const EXPLORER_TX = "https://testnet.arcscan.app/tx/";

const PROOF_SETTLEMENT_TX = "0x416269d3e670c187c2d6d0a4db244c455eef8a1b0b0cd4de8c6d491d4bc9277e";
const PROOF_STEPS = [
  "Inspector Agent verified milestone",
  "Risk evaluation completed",
  "Treasury Agent approved payment",
  "Circle Wallet executed settlement",
  "Settlement confirmed on Arc Testnet",
];

const MAX_CONSECUTIVE_FAILURES_FOR_ERROR = 3;

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
  User: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  Wallet: "M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z",
  Bridge: "M3 12h18M3 12a4 4 0 0 1 4-4M21 12a4 4 0 0 1-4 4M7 8v8M17 8v8",
  Alert: "M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  X: "M18 6 6 18M6 6l12 12",
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

interface Toast {
  id: string;
  message: string;
  kind: "success" | "error" | "info";
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

const TimelineEvent = ({ event, isNew }: { event: FlowEvent; isNew?: boolean }) => (
  <div className={`timeline-event ${event.stage} ${isNew ? "fade-in" : ""}`}>
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

const ProofTimeline = () => (
  <div className="timeline-container proof">
    {PROOF_STEPS.map((step, i) => (
      <div className="timeline-event settled proof-step" key={i}>
        <div className="timeline-marker">
          <Icon path={Icons.CheckCircle} />
        </div>
        <div className="timeline-content">
          <div className="timeline-detail">{step}</div>
        </div>
      </div>
    ))}
    <div className="proof-tx-row">
      <span className="mono">Tx: {PROOF_SETTLEMENT_TX.slice(0, 12)}…</span>
      <a href={`${EXPLORER_TX}${PROOF_SETTLEMENT_TX}`} target="_blank" rel="noreferrer" className="timeline-link">
        View Explorer ↗
      </a>
    </div>
    <p className="proof-caption">No new milestones yet — here's the most recent confirmed settlement while you wait.</p>
  </div>
);

// --- Skeletons ---
const SkeletonLine = ({ w = "100%" }: { w?: string }) => <div className="skeleton-line" style={{ width: w }} />;

const TimelineSkeleton = () => (
  <div className="timeline-container">
    {[0, 1, 2].map((i) => (
      <div className="timeline-event skeleton-row" key={i}>
        <div className="skeleton-circle" />
        <div className="timeline-content">
          <SkeletonLine w="30%" />
          <SkeletonLine w="70%" />
          <SkeletonLine w="50%" />
        </div>
      </div>
    ))}
  </div>
);

const TreasurySkeleton = () => (
  <>
    <div className="balance-label">Treasury Balance</div>
    <SkeletonLine w="50%" />
    <div className="skeleton-spacer" />
    <SkeletonLine w="100%" />
  </>
);

// --- Toasts ---
const ToastStack = ({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) => (
  <div className="toast-stack">
    {toasts.map((t) => (
      <div key={t.id} className={`toast toast-${t.kind} fade-in`}>
        <Icon path={t.kind === "success" ? Icons.CheckCircle : t.kind === "error" ? Icons.Alert : Icons.Activity} className="toast-icon" />
        <span>{t.message}</span>
        <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
          <Icon path={Icons.X} className="toast-close-icon" />
        </button>
      </div>
    ))}
  </div>
);

// --- Main App ---
function App() {
  const [health, setHealth] = useState<TreasuryHealth | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newestEventId, setNewestEventId] = useState<string | null>(null);

  const knownEventIds = useRef<Set<string>>(new Set());
  const hasLoadedOnce = useRef(false);

  const pushToast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const poll = useCallback(async () => {
    try {
      const [h, a, ev] = await Promise.all([
        fetch(`${API_BASE}/health`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`/health ${r.status}`)))),
        fetch(`${API_BASE}/agents`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`/agents ${r.status}`)))),
        fetch(`${API_BASE}/activity`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`/activity ${r.status}`)))),
      ]);

      const newEvents: FlowEvent[] = ev.events || [];
      if (hasLoadedOnce.current) {
        const freshlySettled = newEvents.find((e) => e.stage === "settled" && !knownEventIds.current.has(e.id));
        if (freshlySettled) {
          pushToast(`Settlement confirmed — ${freshlySettled.amount} USDC`, "success");
          setNewestEventId(freshlySettled.id);
          setTimeout(() => setNewestEventId(null), 1200);
        }
      }
      knownEventIds.current = new Set(newEvents.map((e) => e.id));
      hasLoadedOnce.current = true;

      setHealth(h);
      setAgents(a.agents);
      setEvents(newEvents);
      setConnected(true);
      setConsecutiveFailures(0);
      setLoadingInitial(false);
    } catch (err) {
      console.warn("[buildfi] poll failed:", err);
      setConnected(false);
      setLoadingInitial(false);
      setConsecutiveFailures((n) => n + 1);
    }
  }, [pushToast]);

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
  const showHardError = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_FOR_ERROR;

  return (
    <div className="app-layout">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

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

      <main className="main-content">
        <header className="topbar">
          <div className="header-brand">
            <div className="brand-block">
              <img src="/logo.png" alt="" className="brand-logo" />
              <h1 className="brand-title">Build<span className="brand-accent">Fi</span></h1>
            </div>
            <p className="tagline">Programmable Finance Infrastructure for Construction</p>
            <p className="subhead">Autonomous agent-to-agent USDC settlement on Arc</p>
          </div>
          <div className={`status-pill ${connected ? "live" : showHardError ? "error" : "offline"}`}>
            <span className="dot" />
            {connected ? "Treasury Agent Live" : showHardError ? "Connection Error" : "Connecting…"}
          </div>
        </header>

        {showHardError && (
          <div className="error-banner fade-in">
            <Icon path={Icons.Alert} className="error-banner-icon" />
            <div>
              <div className="error-banner-title">Can't reach the Treasury Agent</div>
              <div className="error-banner-sub">
                We've retried {consecutiveFailures} times. The backend may be waking up (Railway free tier) — this page will
                reconnect automatically once it's back.
              </div>
            </div>
          </div>
        )}

        <div className="badge-row">
          <span className="proof-badge">Arc Testnet</span>
          <span className="proof-badge">Circle Wallet</span>
          <span className="proof-badge">ERC-8004</span>
          <span className="proof-badge">CCTP V2</span>
          <span className="proof-badge accent">Live Settlement</span>
        </div>

        <div className="status-strip">
          <div className="status-strip-item">
            <span className="status-strip-dot on" />
            Arc Testnet
          </div>
          <div className="status-strip-item">
            <span className={`status-strip-dot ${connected ? "on" : ""}`} />
            Circle Wallet Connected
          </div>
          <div className="status-strip-item">
            <span className="status-strip-dot on" />
            ERC-8004 Registered
          </div>
          <div className="status-strip-item">
            <span className="status-strip-dot on" />
            CCTP Enabled
          </div>
          <div className="status-strip-item">
            <span className={`status-strip-dot ${connected ? "on" : ""}`} />
            Treasury Agent {connected ? "Live" : "Connecting"}
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="left-col">
            <DashboardCard title="Live Activity Timeline">
              <div className="timeline-header">
                <span>Real-time autonomous settlement flow</span>
                <span className="settlement-count">{totalSettlements} Total Settlements</span>
              </div>
              {loadingInitial ? (
                <TimelineSkeleton />
              ) : events.length === 0 ? (
                <ProofTimeline />
              ) : (
                <div className="timeline-container">
                  {events.map((e) => (
                    <TimelineEvent key={e.id} event={e} isNew={e.id === newestEventId} />
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>

          <div className="right-col">
            <DashboardCard title="Treasury Overview">
              {loadingInitial ? (
                <TreasurySkeleton />
              ) : (
                <>
                  <div className="treasury-balance">
                    <div className="balance-label">Treasury Balance</div>
                    <div className="balance-row">
                      <span className="big-number">
                        {health ? health.treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                      </span>
                      <span className="unit">USDC</span>
                    </div>
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
                </>
              )}
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
              <ul className="ai-behavior-list">
                <li>Monitoring Inspector Agent events</li>
                <li>Evaluating treasury rules</li>
                <li>Authorizing Circle settlement</li>
              </ul>
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
                {agents.length === 0 && !loadingInitial ? (
                  <div className="empty-hint">
                    No agents responded yet. They register automatically once the Treasury Agent connects — check back in a
                    moment.
                  </div>
                ) : agents.length === 0 ? (
                  <div className="agents-skeleton">
                    <SkeletonLine w="90%" />
                    <SkeletonLine w="90%" />
                  </div>
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
                        <span className={`agent-status-chip ${a.role === "treasury" ? (connected ? "active" : "") : "registered"}`}>
                          <span className="chip-dot" />
                          {a.role === "treasury" ? (connected ? "Active" : "Offline") : "Registered"}
                        </span>
                      </div>
                      <div className="agent-details">
                        <div className="detail-row">
                          <span className="detail-label">Address</span>
                          <span className="detail-value mono">{shortAddr(a.address)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">{a.role === "treasury" ? "Wallet" : "Identity"}</span>
                          <span className="detail-value">{a.role === "treasury" ? "Circle Wallet Connected" : "ERC-8004 Identity"}</span>
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

        <DashboardCard title="Architecture" className="architecture-card">
          <div className="pipeline-strip">
            <div className="pipeline-step"><Icon path={Icons.User} /> <span>Owner</span></div>
            <div className="pipeline-connector"></div>
            <div className="pipeline-step"><Icon path={Icons.Shield} /> <span>Inspector Agent</span></div>
            <div className="pipeline-connector"></div>
            <div className="pipeline-step"><Icon path={Icons.Activity} /> <span>Risk Engine</span></div>
            <div className="pipeline-connector"></div>
            <div className="pipeline-step"><Icon path={Icons.Robot} /> <span>Treasury Agent</span></div>
            <div className="pipeline-connector"></div>
            <div className="pipeline-step"><Icon path={Icons.Wallet} /> <span>Circle Wallet</span></div>
            <div className="pipeline-connector"></div>
            <div className="pipeline-step"><Icon path={Icons.Coins} /> <span>Arc Settlement</span></div>
            <div className="pipeline-connector optional"></div>
            <div className="pipeline-step optional"><Icon path={Icons.Bridge} /> <span>CCTP Transfer <em>(optional)</em></span></div>
          </div>
        </DashboardCard>

        <footer className="app-footer">
          Powered by Arc • Circle Developer-Controlled Wallets • ERC-8004 Agent Identity • CCTP V2
        </footer>
      </main>
    </div>
  );
}

export default App;
