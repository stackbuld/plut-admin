import { cn } from "@/lib/utils";
import type { CryptoWalletStatus } from "@/api/types/crypto-wallets.types";

// Wallet-level, Plut-side status — distinct from CryptoSubAccountStatus even though the label set
// overlaps, since a wallet freeze/suspend here never calls the Binance-side sub-account freeze
// (see crypto-wallets.types.ts's doc comment).
const STYLES: Record<CryptoWalletStatus, { label: string; className: string }> = {
  Active: { label: "Active", className: "bg-success/15 text-success ring-1 ring-success/30" },
  Frozen: {
    label: "Frozen",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30",
  },
  Suspended: {
    label: "Suspended",
    className: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  },
  Closed: { label: "Closed", className: "bg-muted text-muted-foreground ring-1 ring-border" },
};

export function CryptoWalletStatusBadge({
  status,
  className,
}: {
  status: CryptoWalletStatus;
  className?: string;
}) {
  const s = STYLES[status] ?? { label: status, className: "bg-secondary text-foreground" };
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
