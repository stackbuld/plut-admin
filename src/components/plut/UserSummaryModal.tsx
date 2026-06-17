import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Copy, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { userQueries, walletQueries } from "@/api";
import { formatDateTime, truncId, currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

function money(amount: number, currency = "NGN") {
  return `${currencySymbol(currency) || ""}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Reusable user summary modal.
 *
 * Opened from any user-id reference (see `UserRef`). Resolves the user's wallet from the
 * userId (`/api/admin/Wallets?userId=`) to show balances, then deep-links to the full
 * profile via "View more".
 */
export function UserSummaryModal({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const enabled = open && !!userId;

  const { data: user, isLoading } = useQuery({ ...userQueries.detail(userId ?? ""), enabled });
  const { data: wallets } = useQuery({ ...walletQueries.byUser(userId ?? ""), enabled });
  const walletId = wallets?.[0]?.id;
  const { data: balance, isLoading: balanceLoading } = useQuery({
    ...walletQueries.balance(walletId ?? ""),
    enabled: open && !!walletId,
  });

  const goToProfile = () => {
    if (!userId) return;
    onOpenChange(false);
    navigate({ to: "/admin/giftcards/users/$userId", params: { userId } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Summary</DialogTitle>
          <DialogDescription>
            Quick snapshot — open the full profile for trades, strikes and blocks.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !user ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Identity */}
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                  {user.displayName?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">{user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge
                className="ml-auto"
                tone={
                  user.status === "Active"
                    ? "success"
                    : user.status === "Suspended"
                      ? "danger"
                      : "warning"
                }
              >
                {user.status}
              </Badge>
            </div>

            {/* Balances — only when the user has a wallet */}
            {walletId && (
              <div className="grid grid-cols-2 gap-2">
                <BalanceCard
                  label="Current balance"
                  loading={balanceLoading}
                  value={balance ? money(balance.availableBalance, balance.currency) : null}
                />
                <BalanceCard
                  label="Holding balance"
                  loading={balanceLoading}
                  value={balance ? money(balance.heldBalance, balance.currency) : null}
                />
              </div>
            )}

            {/* Details */}
            <div className="divide-y divide-border rounded-lg border bg-background">
              <Row label="Phone" value={user.phoneNumber ?? "—"} />
              <Row label="KYC Tier" value={user.kycTier} />
              <Row label="Created" value={formatDateTime(user.createdAt)} />
              {user.lastLoginAt && (
                <Row label="Last login" value={formatDateTime(user.lastLoginAt)} />
              )}
              <Row
                label="User ID"
                value={
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-xs">{truncId(user.userId, 18)}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.userId);
                        toast.success("Copied");
                      }}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      title="Copy user ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                }
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={goToProfile} disabled={!userId}>
            View more <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Self-contained clickable user reference. Drop in anywhere a user id is shown.
 * Renders an inline button that opens the UserSummaryModal — manages its own state, so
 * it works without any parent wiring.
 */
export function UserRef({
  userId,
  children,
  className,
  title = "View user summary",
}: {
  userId: string;
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "text-left underline-offset-2 transition-colors hover:text-primary hover:underline",
          className,
        )}
      >
        {children ?? truncId(userId)}
      </button>
      <UserSummaryModal userId={open ? userId : null} open={open} onOpenChange={setOpen} />
    </>
  );
}

function BalanceCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-secondary/30 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Wallet className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (value ?? "—")}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Badge({
  children,
  tone,
  className,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    success: "border-success/40 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
