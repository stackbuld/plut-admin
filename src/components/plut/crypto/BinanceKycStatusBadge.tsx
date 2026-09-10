import { cn } from "@/lib/utils";
import type { CryptoKycShareStatus } from "@/api/types/crypto.types";

// NotSubmitted/Submitted are normal, expected "Binance hasn't reported an outcome yet" states —
// deliberately neutral/muted styling, not alarming, distinct from the failure states.
const STYLES: Record<CryptoKycShareStatus, { label: string; className: string }> = {
  NotSubmitted: { label: "Not Submitted", className: "bg-secondary text-muted-foreground" },
  Submitted: {
    label: "Submitted — Awaiting Outcome",
    className: "bg-secondary text-foreground",
  },
  SubmissionFailed: {
    label: "Submission Failed",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
  ProviderPending: {
    label: "Binance Reviewing",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  ProviderApproved: {
    label: "Binance Approved",
    className: "bg-success/15 text-success ring-1 ring-success/30",
  },
  ProviderRejected: {
    label: "Binance Rejected",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
};

export function BinanceKycStatusBadge({
  status,
  className,
}: {
  status: CryptoKycShareStatus;
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

/** Attention-needing per the list page's highlighted section rule. */
export const isKycShareStatusAttention = (s: CryptoKycShareStatus) =>
  s === "SubmissionFailed" || s === "ProviderRejected";
