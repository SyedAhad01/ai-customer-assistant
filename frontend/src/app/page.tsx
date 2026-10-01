import Link from "next/link";

// ── WHY data ─────────────────────────────────────────────────────────────────

const problems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
    ),
    title: "Hours, Not Seconds",
    body: "Customers wait 24–48 hours for refund decisions that a policy-aware agent can make in under 10 seconds. Every hour of delay is a loyalty risk.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Manual Policy Hunting",
    body: "Support agents spend more time digging through policy documents than helping customers. Queues pile up while the answer is buried in a PDF.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    title: "Inconsistent Rulings",
    body: "Identical refund cases get different outcomes depending on which agent handles them. Inconsistency erodes trust and opens legal risk.",
  },
];

// ── HOW data ──────────────────────────────────────────────────────────────────

const steps = [
  {
    tool: "conversation",
    label: "Natural Language Intake",
    detail: "The customer describes their situation in plain language — no forms, no ticket IDs required to start.",
  },
  {
    tool: "lookup_customer",
    label: "Identity Verification",
    detail: "The agent calls lookup_customer to verify the account, tier, and history before any decision is made.",
  },
  {
    tool: "lookup_order",
    label: "Order Validation",
    detail: "Order ownership is confirmed. The agent checks delivery date, product category, and sale status.",
  },
  {
    tool: "check_refund_policy",
    label: "Policy Evaluation",
    detail: "Every applicable rule is evaluated — no hallucination, no shortcuts. The policy document is the ground truth.",
  },
  {
    tool: "process_refund / deny_refund",
    label: "Decision & Resolution",
    detail: "The agent approves or denies with a refund ID or a rule-cited reason, completing the case end-to-end.",
  },
];

// ── WHAT data ─────────────────────────────────────────────────────────────────

const features = [
  {
    title: "Real-Time Streaming",
    body: "Token-by-token SSE streaming keeps the UI responsive. No loading spinners — you see the agent think.",
    accent: "text-accent",
  },
  {
    title: "Policy-Grounded Decisions",
    body: "Rules live in a Markdown document. The agent reads and cites them. Zero hallucination on eligibility.",
    accent: "text-success",
  },
  {
    title: "Full Audit Trail",
    body: "Every tool call, input, and output is logged per session and visible live in the Admin dashboard.",
    accent: "text-warning",
  },
  {
    title: "Voice I/O",
    body: "ElevenLabs STT transcribes speech to text (with smart ID normalization) and TTS reads responses aloud.",
    accent: "text-accent-light",
  },
  {
    title: "Live Admin Monitoring",
    body: "WebSocket-powered dashboard shows sessions, reasoning steps, and refund decisions as they happen.",
    accent: "text-accent",
  },
  {
    title: "Production-Ready Stack",
    body: "Multi-stage Docker builds, nginx reverse proxy, non-root containers, health checks, SSE + WS support.",
    accent: "text-success",
  },
];

const stack = [
 "Python 3.12", "FastAPI", "LangGraph", "Gemini 3.5 Flash-Lite",
  "Next.js 15", "TypeScript", "Tailwind CSS", "Docker", "nginx", "ElevenLabs",
];

// ── Shared section label ──────────────────────────────────────────────────────

function SectionLabel({ index, text }: { index: string; text: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-mono text-text-col-tertiary tracking-[0.2em]">{index}</span>
      <span className="h-px flex-1 max-w-[40px] bg-border-col" />
      <span className="text-xs font-mono font-semibold text-accent tracking-[0.2em] uppercase">{text}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="h-full overflow-y-auto">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-28 md:py-40 min-h-[85vh]">
        {/* Background glow + grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(125,211,252,0.07),transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(#7DD3FC 1px,transparent 1px),linear-gradient(90deg,#7DD3FC 1px,transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-xs font-mono tracking-[0.35em] text-accent uppercase mb-6">
            AI Customer Support · E-commerce Refunds
          </p>

          <h1 className="font-display font-bold text-5xl md:text-7xl text-text-col-primary leading-[1.1] mb-6">
            Refund Decisions<br />
            <em className="text-accent not-italic">in Seconds.</em>
          </h1>

          <p className="text-lg md:text-xl text-text-col-secondary max-w-2xl mx-auto leading-relaxed mb-10">
            An autonomous LangGraph agent that verifies customers, validates orders, applies your
            refund policy, and resolves support cases end-to-end — without a human in the loop.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/chat"
              className="bg-accent text-accent-subtle px-8 py-3 rounded font-semibold font-mono text-sm hover:opacity-90 active:opacity-75 transition-opacity"
            >
              Try the Agent →
            </Link>
            <Link
              href="/admin"
              className="border border-border-col text-text-col-secondary px-8 py-3 rounded font-mono text-sm hover:border-accent hover:text-accent transition-colors duration-200"
            >
              Admin Dashboard
            </Link>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-3 justify-center mt-10">
            {[
              { dot: "bg-success", label: "Real-time streaming" },
              { dot: "bg-accent",  label: "Policy-grounded" },
              { dot: "bg-warning", label: "Full audit trail" },
            ].map(({ dot, label }) => (
              <span
                key={label}
                className="flex items-center gap-2 text-xs font-mono text-text-col-tertiary border border-border-col bg-background-surface px-3 py-1.5 rounded-full"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border-col bg-background-surface py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionLabel index="01" text="Why" />
          <h2 className="font-display font-bold text-3xl md:text-4xl text-text-col-primary mb-4">
            The Support Problem Worth Solving
          </h2>
          <p className="text-text-col-secondary max-w-2xl mb-14 leading-relaxed">
            Traditional e-commerce support is slow, manual, and inconsistent. The cost is measured
            in churned customers and agent burnout — not just ticket volume.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {problems.map(({ icon, title, body }) => (
              <div
                key={title}
                className="bg-background-base border border-border-col rounded p-6 hover:border-accent/30 transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded bg-background-raised border border-border-col flex items-center justify-center text-accent mb-4">
                  {icon}
                </div>
                <h3 className="font-display font-semibold text-text-col-primary text-lg mb-2">{title}</h3>
                <p className="text-text-col-secondary text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border-col py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionLabel index="02" text="How" />
          <h2 className="font-display font-bold text-3xl md:text-4xl text-text-col-primary mb-4">
            An Agent Loop That Thinks Before It Acts
          </h2>
          <p className="text-text-col-secondary max-w-2xl mb-14 leading-relaxed">
            Built on LangGraph, the agent iterates through a tool-calling loop — each step grounded
            in real data — until it reaches a policy-backed decision.
          </p>

          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-5 top-6 bottom-6 w-px bg-gradient-to-b from-accent/60 via-accent/20 to-transparent hidden md:block" />

            <div className="space-y-4">
              {steps.map(({ tool, label, detail }, i) => (
                <div key={label} className="flex gap-6 items-start group">
                  {/* Step number */}
                  <div className="shrink-0 w-10 h-10 rounded-full border border-accent/40 bg-background-surface flex items-center justify-center font-mono text-sm font-bold text-accent z-10">
                    {i + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-background-surface border border-border-col rounded p-5 group-hover:border-accent/30 transition-colors duration-200">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="font-display font-semibold text-text-col-primary">{label}</span>
                      <span className="text-[10px] font-mono text-text-col-tertiary bg-background-raised border border-border-col px-2 py-0.5 rounded">
                        {tool}
                      </span>
                    </div>
                    <p className="text-sm text-text-col-secondary leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture note */}
          <div className="mt-10 border border-accent/20 bg-accent/5 rounded p-5">
            <p className="text-xs font-mono text-text-col-tertiary leading-relaxed">
              <span className="text-accent font-semibold">Architecture: </span>
             FastAPI (SSE) → LangGraph StateGraph → Gemini tool-calling loop →
              tool execution → state update → next iteration or END node → WebSocket broadcast to Admin.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border-col bg-background-surface py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <SectionLabel index="03" text="What" />
          <h2 className="font-display font-bold text-3xl md:text-4xl text-text-col-primary mb-4">
            What's Built Inside
          </h2>
          <p className="text-text-col-secondary max-w-2xl mb-14 leading-relaxed">
            Every layer — from the agent loop to the admin dashboard to the Docker production setup — is
            built for real-world use, not just demos.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {features.map(({ title, body, accent }) => (
              <div
                key={title}
                className="bg-background-base border border-border-col rounded p-5 hover:border-accent/30 transition-colors duration-200"
              >
                <div className={`text-xs font-mono font-bold uppercase tracking-widest mb-3 ${accent}`}>
                  {title}
                </div>
                <p className="text-sm text-text-col-secondary leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {/* Tech stack */}
          <div>
            <p className="text-xs font-mono text-text-col-tertiary uppercase tracking-widest mb-4">Tech Stack</p>
            <div className="flex flex-wrap gap-2">
              {stack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs font-mono text-text-col-secondary border border-border-col bg-background-raised px-3 py-1.5 rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border-col py-24 px-6">
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(125,211,252,0.06),transparent)] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-mono tracking-[0.3em] text-accent uppercase mb-4">Live Demo</p>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-text-col-primary mb-4">
              See It Decide in Real Time
            </h2>
            <p className="text-text-col-secondary mb-10 leading-relaxed max-w-lg mx-auto">
              Tell the agent your Customer ID and Order ID. Watch it look up your account, check the
              order, apply the policy, and issue a decision — all in a single conversation.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/chat"
                className="bg-accent text-accent-subtle px-10 py-3.5 rounded font-semibold font-mono text-sm hover:opacity-90 active:opacity-75 transition-opacity"
              >
                Launch the Agent →
              </Link>
              <Link
                href="/admin"
                className="border border-border-col text-text-col-secondary px-10 py-3.5 rounded font-mono text-sm hover:border-accent hover:text-accent transition-colors duration-200"
              >
                Open Admin Panel
              </Link>
            </div>
            <p className="text-xs text-text-col-tertiary font-mono mt-6">
              Try: Customer ID <span className="text-accent">CUST001</span> · Order ID <span className="text-accent">ORD1017</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-col py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-mono text-text-col-tertiary">
            AI Customer Support Agent · LangGraph + Gemini
          </p>
          <div className="flex gap-4">
            <Link href="/chat"  className="text-xs font-mono text-text-col-tertiary hover:text-accent transition-colors">Chat</Link>
            <Link href="/admin" className="text-xs font-mono text-text-col-tertiary hover:text-accent transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
