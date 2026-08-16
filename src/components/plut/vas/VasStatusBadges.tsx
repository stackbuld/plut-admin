import { cn } from "@/lib/utils";
import type { VasProviderHealthStatus, VasTransactionStatus } from "@/api/types/vas.types";

const TRANSACTION_STYLES: Record<VasTransactionStatus, { label: string; className: string }> = {
  Initiated: { label: "Initiated", className: "bg-secondary text-foreground" },
  PendingProvider: {
    label: "Pending Provider",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  PendingValidation: {
    label: "Pending Validation",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  PendingResolution: {
    label: "Pending Resolution",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
  },
  Successful: {
    label: "Successful",
    className: "bg-success/15 text-success ring-1 ring-success/30",
  },
  Failed: {
    label: "Failed",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
  Refunded: { label: "Refunded", className: "bg-muted text-muted-foreground ring-1 ring-border" },
  Reversed: { label: "Reversed", className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

export function VasTransactionStatusBadge({
  status,
  className,
}: {
  status: VasTransactionStatus;
  className?: string;
}) {
  const s = TRANSACTION_STYLES[status];
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

const PROVIDER_STYLES: Record<VasProviderHealthStatus, { label: string; className: string }> = {
  Healthy: { label: "Healthy", className: "bg-success/15 text-success ring-1 ring-success/30" },
  Degraded: {
    label: "Degraded",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
  },
  Unhealthy: {
    label: "Unhealthy",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
  Maintenance: {
    label: "Maintenance",
    className: "bg-muted text-muted-foreground ring-1 ring-border",
  },
};

export function VasProviderStatusBadge({
  status,
  className,
}: {
  status: VasProviderHealthStatus;
  className?: string;
}) {
  const s = PROVIDER_STYLES[status] ?? PROVIDER_STYLES.Maintenance;
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

export const formatVasAmount = (n: number, currency = "NGN") =>
  (currency === "NGN" ? "₦" : `${currency} `) +
  n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
