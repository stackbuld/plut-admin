import { cn } from "@/lib/utils";
import type { CryptoTransactionStatus } from "@/api/types/crypto-transactions.types";

// CryptoTransaction's own five-state vocabulary (crypto-service Domain/Enums/Enums.cs) —
// deliberately not shared with CryptoWithdrawalStatusBadge's eleven states: a ledger row's
// lifecycle is simpler than a withdrawal's on-chain submission pipeline.
const STYLES: Record<CryptoTransactionStatus, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "bg-secondary text-foreground" },
  AwaitingConfirmation: {
    label: "Awaiting Confirmation",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  Successful: { label: "Successful", className: "bg-success/15 text-success ring-1 ring-success/30" },
  Failed: { label: "Failed", className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30" },
  Reversed: { label: "Reversed", className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

export function CryptoTransactionStatusBadge({
  status,
  className,
}: {
  status: CryptoTransactionStatus;
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
