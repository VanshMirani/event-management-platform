import { formatStatusLabel } from "../utils/formatStatusLabel.js";

const statusStyles = {
  ACTIVE: "border-mint/25 bg-mint/10 text-mint",
  BLOCKED: "border-ember/25 bg-ember/10 text-ember",
  DRAFT: "border-gold/30 bg-gold/15 text-gold",
  PUBLISHED: "border-mint/25 bg-mint/10 text-mint",
  PENDING: "border-gold/30 bg-gold/15 text-gold",
  CONFIRMED: "border-mint/25 bg-mint/10 text-mint",
  SUCCESS: "border-mint/25 bg-mint/10 text-mint",
  FAILED: "border-ember/25 bg-ember/10 text-ember",
  USED: "border-aurora/25 bg-aurora/10 text-aurora",
  VALID: "border-cyan/30 bg-cyan/10 text-cyan",
  INACTIVE: "border-slate-300 bg-slate-100 text-slate-600",
  REFUNDED: "border-aurora/25 bg-aurora/10 text-aurora",
  CANCELLED: "border-ember/25 bg-ember/10 text-ember",
  COMPLETED: "border-slate-300 bg-slate-100 text-slate-700",
  CREATED: "border-cyan/30 bg-cyan/10 text-cyan"
};

export function StatusBadge({ status, className = "" }) {
  const normalizedStatus = String(status ?? "").trim().toUpperCase();
  const style =
    statusStyles[normalizedStatus] ??
    "border-slate-300 bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-extrabold tracking-wide ${style} ${className}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
