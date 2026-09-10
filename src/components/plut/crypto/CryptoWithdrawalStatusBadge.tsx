import { cn } from "@/lib/utils";
import type { CryptoWithdrawalStatus } from "@/api/types/crypto-withdrawals.types";

// Crypto's own eleven-state vocabulary — deliberately not shared with WithdrawalStatusBadge
// (fiat, src/components/plut/withdrawals/WithdrawalStatusBadge.tsx). An on-chain send has more
// failure surface than a bank transfer, so this must render the exact state an admin needs to
// act on rather than collapsing everything into a generic "Processing".
const STYLES: Record<CryptoWithdrawalStatus, { label: string; className: string }> = {
  Initiated:        { label: "Initiated",         className: "bg-secondary text-foreground" },
  PendingApproval:  { label: "Pending Approval",  className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30" },
  Approved:         { label: "Approved",          className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30" },
  PendingSweep:     { label: "Pending Sweep",     className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30" },
  SweepFailed:      { label: "Sweep Failed",      className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30" },
  PendingBroadcast: { label: "Pending Broadcast", className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30" },
  Broadcasting:     { label: "Broadcasting",      className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30" },
  Successful:       { label: "Successful",        className: "bg-success/15 text-success ring-1 ring-success/30" },
  Failed:           { label: "Failed",            className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30" },
  Rejected:         { label: "Rejected",          className: "bg-muted text-muted-foreground ring-1 ring-border" },
  Reversed:         { label: "Reversed",          className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

export function CryptoWithdrawalStatusBadge({
  status,
  className,
}: {
  status: CryptoWithdrawalStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

/** "Needs attention" per 04-WITHDRAWALS.md §2: PendingApproval always needs a decision;
 * SweepFailed/PendingBroadcast need a retry or investigation once stuck beyond a reasonable
 * threshold. Computed client-side from status + createdAt — no backend field for this. */
const STUCK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export function isCryptoWithdrawalStuck(status: CryptoWithdrawalStatus, createdAt: string): boolean {
  if (status !== "SweepFailed" && status !== "PendingBroadcast") return false;
  return Date.now() - new Date(createdAt).getTime() > STUCK_THRESHOLD_MS;
}

export function isCryptoWithdrawalAttention(status: CryptoWithdrawalStatus, createdAt: string): boolean {
  return status === "PendingApproval" || isCryptoWithdrawalStuck(status, createdAt);
}

/** Statuses SweepFailed/PendingBroadcast get their own retry action — retrying resumes the
 * multi-step submission operation rather than re-deciding whether the withdrawal should happen. */
export function canRetryCryptoWithdrawalSubmission(status: CryptoWithdrawalStatus): boolean {
  return status === "SweepFailed" || status === "PendingBroadcast";
}

export const formatCrypto = (amount: number, asset: string) =>
  `${amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${asset}`;
