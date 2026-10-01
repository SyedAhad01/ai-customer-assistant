"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RefundBadge from "@/components/RefundBadge";
import ReasoningLog from "@/components/ReasoningLog";

// ── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  step: string;
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
}

interface Session {
  session_id: string;
  customer_id: string;
  created_at: string;
  refund_decision: "APPROVED" | "DENIED" | "PENDING";
  decision_reason: string;
  reasoning_log: LogEntry[];
}

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  tier: string;
  account_age_days: number;
  total_orders: number;
  phone: string;
}

interface Order {
  order_id: string;
  customer_id: string;
  product: string;
  category: string;
  amount: number;
  purchase_date: string;
  delivered: boolean;
  delivery_date: string | null;
  is_sale_item: boolean;
  opened: boolean;
  reason_for_return: string;
  days_since_purchase: number;
}

type Tab = "sessions" | "customers" | "orders" | "rules";

// ── Tab button ────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-mono font-medium uppercase tracking-wider transition-colors duration-150 border ${
        active
          ? "bg-accent/10 text-accent border-accent/30"
          : "text-text-col-tertiary hover:text-text-col-secondary border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// ── Sessions tab ──────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [liveLog, setLiveLog] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/admin/logs`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as {
          type: string;
          sessions?: Session[];
          session_id?: string;
          data?: LogEntry;
          refund_decision?: string;
        };
        if (event.type === "init" && event.sessions) {
          const map: Record<string, Session> = {};
          event.sessions.forEach((s) => (map[s.session_id] = s));
          setSessions(map);
        } else if (event.type === "tool_call" || event.type === "tool_result") {
          const sid = event.session_id!;
          if (event.data) {
            setSessions((prev) => {
              const existing = prev[sid] || {
                session_id: sid,
                customer_id: "",
                created_at: new Date().toISOString(),
                refund_decision: "PENDING" as const,
                decision_reason: "",
                reasoning_log: [],
              };
              return { ...prev, [sid]: { ...existing, reasoning_log: [...existing.reasoning_log, event.data!] } };
            });
            if (sid === selected) setLiveLog((prev) => [...prev, event.data!]);
          }
        } else if (event.type === "done") {
          const sid = event.session_id!;
          setSessions((prev) => {
            const existing = prev[sid];
            if (!existing) return prev;
            return { ...prev, [sid]: { ...existing, refund_decision: (event.refund_decision as Session["refund_decision"]) || "PENDING" } };
          });
        }
      } catch { /* skip malformed */ }
    };
    return () => ws.close();
  }, [selected]);

  const sessionList = Object.values(sessions).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const selectSession = (id: string) => {
    setSelected(id);
    setLiveLog(sessions[id]?.reasoning_log ?? []);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-background-surface border-r border-border-col flex flex-col">
        <div className="px-5 py-3 border-b border-border-col flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-text-col-tertiary uppercase tracking-widest">Live Sessions</span>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-danger"}`} title={connected ? "Connected" : "Disconnected"} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessionList.length === 0 ? (
            <div className="text-center py-12 text-text-col-tertiary text-sm px-4">
              <p className="text-2xl mb-2">📭</p>
              No sessions yet.{" "}
              <a href="/chat" className="text-accent hover:text-accent-light transition-colors">Start a chat</a>
            </div>
          ) : (
            sessionList.map((s) => (
              <button
                key={s.session_id}
                onClick={() => selectSession(s.session_id)}
                className={`w-full text-left px-5 py-4 border-b border-border-col hover:bg-background-raised transition-colors duration-150 ${
                  selected === s.session_id ? "bg-background-raised border-l-2 border-l-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-text-col-primary truncate">{s.customer_id || "Unknown"}</span>
                  <RefundBadge decision={s.refund_decision} />
                </div>
                <p className="text-xs text-text-col-tertiary font-mono">{s.session_id.slice(0, 8)}…</p>
                <p className="text-xs text-text-col-tertiary mt-0.5 font-mono">
                  {new Date(s.created_at).toLocaleTimeString()} · {s.reasoning_log.length} steps
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Detail panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background-base">
        <div className="px-6 py-4 bg-background-surface border-b border-border-col">
          <h2 className="font-display font-semibold text-text-col-primary">
            {selected ? `Session: ${selected.slice(0, 12)}…` : "Select a session to view reasoning"}
          </h2>
          {selected && sessions[selected] && (
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-text-col-tertiary font-mono">Customer: <strong className="text-accent">{sessions[selected].customer_id || "N/A"}</strong></span>
              <span className="text-xs text-text-col-tertiary font-mono">Started: {new Date(sessions[selected].created_at).toLocaleString()}</span>
              <RefundBadge decision={sessions[selected].refund_decision} />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-text-col-tertiary text-center">
              <div>
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-display font-semibold text-text-col-secondary">Select a session from the sidebar</p>
                <p className="text-sm mt-1">to see the agent&apos;s live reasoning log</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-text-col-primary">Reasoning Steps</h3>
                <span className="text-xs text-text-col-tertiary font-mono bg-background-raised border border-border-col px-2 py-1 rounded">{liveLog.length} steps</span>
              </div>
              <ReasoningLog entries={liveLog} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Customers tab ─────────────────────────────────────────────────────────────

function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center flex-1 text-text-col-tertiary font-mono text-sm">Loading…</div>;

  return (
    <div className="flex-1 overflow-auto p-6 bg-background-base">
      <div className="bg-background-surface rounded border border-border-col overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background-raised border-b border-border-col">
            <tr>
              {["ID", "Name", "Email", "Phone", "Tier", "Account Age", "Orders"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-mono font-semibold text-text-col-tertiary uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-col">
            {customers.map((c) => (
              <tr key={c.customer_id} className="hover:bg-background-raised transition-colors duration-150">
                <td className="px-4 py-3 font-mono text-xs text-accent">{c.customer_id}</td>
                <td className="px-4 py-3 font-medium text-text-col-primary">{c.name}</td>
                <td className="px-4 py-3 text-text-col-secondary">{c.email}</td>
                <td className="px-4 py-3 text-text-col-secondary font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-mono uppercase tracking-wider ${
                    c.tier === "premium"
                      ? "border-warning/30 text-warning bg-warning/5"
                      : "border-border-col text-text-col-tertiary"
                  }`}>
                    {c.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-col-secondary font-mono text-xs">{c.account_age_days}d</td>
                <td className="px-4 py-3 text-text-col-secondary font-mono text-xs">{c.total_orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center flex-1 text-text-col-tertiary font-mono text-sm">Loading…</div>;

  return (
    <div className="flex-1 overflow-auto p-6 bg-background-base">
      <div className="bg-background-surface rounded border border-border-col overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background-raised border-b border-border-col">
            <tr>
              {["Order ID", "Customer", "Product", "Category", "Amount", "Purchase Date", "Delivered", "Sale", "Opened", "Days Since"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-mono font-semibold text-text-col-tertiary uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-col">
            {orders.map((o) => (
              <tr key={o.order_id} className="hover:bg-background-raised transition-colors duration-150">
                <td className="px-4 py-3 font-mono text-xs text-accent">{o.order_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-accent-light">{o.customer_id}</td>
                <td className="px-4 py-3 font-medium text-text-col-primary max-w-[200px] truncate" title={o.product}>{o.product}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded border border-border-col text-xs font-mono text-text-col-tertiary capitalize">{o.category}</span>
                </td>
                <td className="px-4 py-3 text-text-col-primary font-mono font-medium">${o.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-text-col-secondary font-mono text-xs whitespace-nowrap">{o.purchase_date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-mono ${o.delivered ? "border-success/30 text-success bg-success/5" : "border-warning/30 text-warning bg-warning/5"}`}>
                    {o.delivered ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {o.is_sale_item && <span className="px-2 py-0.5 rounded border border-danger/30 text-danger bg-danger/5 text-xs font-mono">Sale</span>}
                </td>
                <td className="px-4 py-3">
                  {o.opened && <span className="px-2 py-0.5 rounded border border-warning/30 text-warning bg-warning/5 text-xs font-mono">Opened</span>}
                </td>
                <td className="px-4 py-3 text-text-col-secondary font-mono text-xs">{o.days_since_purchase}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Rules tab ─────────────────────────────────────────────────────────────────

function RulesTab() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/policy")
      .then((r) => r.json())
      .then((d) => setContent(d.content))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center flex-1 text-text-col-tertiary font-mono text-sm">Loading…</div>;

  return (
    <div className="flex-1 overflow-auto p-6 bg-background-base">
      <div className="max-w-3xl mx-auto bg-background-surface border border-border-col rounded p-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="font-display font-bold text-text-col-primary text-2xl mb-2">{children}</h1>
            ),
            h2: ({ children }) => {
              const text = String(children);
              const isRule = text.startsWith("Rule");
              return (
                <h2 className={`font-display font-semibold text-base mt-8 mb-2 pb-2 border-b border-border-col flex items-center gap-2 ${
                  isRule ? "text-accent" : "text-text-col-primary"
                }`}>
                  {isRule && (
                    <span className="text-xs font-mono bg-accent/10 border border-accent/30 text-accent px-2 py-0.5 rounded">
                      {text.split("—")[0].trim()}
                    </span>
                  )}
                  {isRule ? text.split("—").slice(1).join("—").trim() : text}
                </h2>
              );
            },
            p: ({ children }) => <p className="text-text-col-secondary text-sm leading-relaxed mb-3">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-text-col-primary">{children}</strong>,
            hr: () => <hr className="border-border-col my-6" />,
            table: ({ children }) => (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm border border-border-col rounded overflow-hidden">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-background-raised">{children}</thead>,
            tbody: ({ children }) => <tbody className="divide-y divide-border-col">{children}</tbody>,
            th: ({ children }) => (
              <th className="text-left px-4 py-2.5 text-xs font-mono font-semibold text-text-col-tertiary uppercase tracking-widest border-b border-border-col">
                {children}
              </th>
            ),
            td: ({ children }) => {
              const text = String(children).trim();
              const isYes = text === "Yes";
              const isNo  = text === "No";
              return (
                <td className={`px-4 py-2.5 text-sm font-mono ${
                  isYes ? "text-success" : isNo ? "text-danger" : "text-text-col-secondary"
                }`}>
                  {children}
                </td>
              );
            },
            code: ({ children }) => (
              <code className="bg-background-raised text-accent px-1.5 py-0.5 rounded text-xs font-mono border border-border-col">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("sessions");

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Page controls bar */}
      <div className="bg-background-surface border-b border-border-col px-6 py-2.5 flex items-center justify-between shrink-0">
        <p className="text-xs text-text-col-tertiary font-mono">Real-time agent monitoring</p>
        <div className="flex gap-1">
          <TabButton active={tab === "sessions"} onClick={() => setTab("sessions")}>Sessions</TabButton>
          <TabButton active={tab === "customers"} onClick={() => setTab("customers")}>Customers</TabButton>
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>Orders</TabButton>
          <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>Policy</TabButton>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden bg-background-base">
        {tab === "sessions"  && <SessionsTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "orders"    && <OrdersTab />}
        {tab === "rules"     && <RulesTab />}
      </div>
    </div>
  );
}
