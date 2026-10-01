"use client";

type Decision = "APPROVED" | "DENIED" | "PENDING";

const styles: Record<Decision, string> = {
  APPROVED: "border-success/40 text-success bg-success/5",
  DENIED:   "border-danger/40 text-danger bg-danger/5",
  PENDING:  "border-warning/40 text-warning bg-warning/5",
};

const icons: Record<Decision, string> = {
  APPROVED: "✓",
  DENIED:   "✗",
  PENDING:  "·",
};

export default function RefundBadge({ decision }: { decision: Decision }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border tracking-wider uppercase ${styles[decision]}`}>
      <span>{icons[decision]}</span>
      {decision}
    </span>
  );
}
