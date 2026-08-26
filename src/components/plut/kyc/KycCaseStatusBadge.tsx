import { cn } from "@/lib/utils";
import type { KycStatus } from "@/api/types/kyc.types";

const STATUS_STYLES: Record<KycStatus, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "bg-secondary text-foreground" },
  InReview: {
    label: "In Review",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  NeedsInfo: {
    label: "Needs Info",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
  },
  Approved: {
    label: "Approved",
    className: "bg-success/15 text-success ring-1 ring-success/30",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
  Reset: {
    label: "Reset",
    className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30",
  },
};

export function KycCaseStatusBadge({
  status,
  className,
}: {
  status: KycStatus;
  className?: string;
}) {
  const s = STATUS_STYLES[status];
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
