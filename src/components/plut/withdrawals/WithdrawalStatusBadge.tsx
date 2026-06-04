import { cn } from "@/lib/utils";
import type { WithdrawalStatus } from "@/api/types/withdrawals.types";

const STYLES: Record<WithdrawalStatus, { label: string; className: string }> = {
  Initiated:       { label: "Initiated",        className: "bg-secondary text-foreground" },
  PendingLedger:   { label: "Pending Ledger",   className: "bg-secondary text-foreground" },
  PendingApproval: { label: "Pending Approval", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30" },
  PendingProvider: { label: "Awaiting Bank",    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30" },
  Successful:      { label: "Successful",       className: "bg-success/15 text-success ring-1 ring-success/30" },
  Failed:          { label: "Failed",           className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30" },
  Reversed:        { label: "Reversed",         className: "bg-muted text-muted-foreground ring-1 ring-border" },
  Rejected:        { label: "Rejected",         className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

export function WithdrawalStatusBadge({ status, className }: { status: WithdrawalStatus; className?: string }) {
  const s = STYLES[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", s.className, className)}>
      {s.label}
    </span>
  );
}

export const maskAccount = (n: string) =>
  n.length <= 4 ? n : `${n.slice(0, 4)} **** ${n.slice(-4)}`;

export const formatNgn = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });