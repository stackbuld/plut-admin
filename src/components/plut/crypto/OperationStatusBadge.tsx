import { cn } from "@/lib/utils";
import type { CryptoOperationStatus } from "@/api/types/crypto.types";

const STYLES: Record<CryptoOperationStatus, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "bg-secondary text-foreground" },
  Running: {
    label: "Running",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  Succeeded: { label: "Succeeded", className: "bg-success/15 text-success ring-1 ring-success/30" },
  Failed: {
    label: "Failed",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
};

export function OperationStatusBadge({
  status,
  className,
}: {
  status: CryptoOperationStatus;
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
