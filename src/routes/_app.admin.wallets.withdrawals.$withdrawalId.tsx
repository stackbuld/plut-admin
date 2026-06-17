import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  X,
  AlertTriangle,
  BadgeCheck,
  Wallet,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { withdrawalQueries } from "@/api/withdrawals";
import { walletQueries, userQueries } from "@/api";
import type { AdminWalletTransaction } from "@/api/wallets";
import {
  WithdrawalStatusBadge,
  formatNgn,
  maskAccount,
} from "@/components/plut/withdrawals/WithdrawalStatusBadge";
import { ApproveWithdrawalDialog } from "@/components/plut/withdrawals/ApproveWithdrawalDialog";
import { RejectWithdrawalDialog } from "@/components/plut/withdrawals/RejectWithdrawalDialog";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime, relativeTime, truncId, currencySymbol } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/wallets/withdrawals/$withdrawalId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(withdrawalQueries.detail(params.withdrawalId));
  },
  component: WithdrawalDetail,
});

function money(amount: number, currency = "NGN") {
  return `${currencySymbol(currency) || ""}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function WithdrawalDetail() {
  const { withdrawalId } = Route.useParams();
  const { data: w, isLoading } = useQuery(withdrawalQueries.detail(withdrawalId));
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data: user } = useQuery({ ...userQueries.detail(w?.userId ?? ""), enabled: !!w?.userId });
  const {
    data: balance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useQuery({ ...walletQueries.balance(w?.walletId ?? ""), enabled: !!w?.walletId });

  if (isLoading || !w) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = w.status === "PendingApproval";
  const currentBalance = balance?.availableBalance ?? w.walletBalance ?? null;
  const holdingBalance = balance?.heldBalance ?? null;
  const walletCurrency = balance?.currency ?? w.currency ?? "NGN";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/admin/wallets/withdrawals/all"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to withdrawals
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <WithdrawalStatusBadge status={w.status} />
            {w.createdAt && (
              <p className="mt-2 text-sm text-muted-foreground">
                Submitted: {formatDateTime(w.createdAt)}
              </p>
            )}
            {w.completedAt && (
              <p className="text-xs text-muted-foreground">
                Completed: {formatDateTime(w.completedAt)}
              </p>
            )}
          </div>
          {w.status === "Successful" && w.approvalMethod === "Manual" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <BadgeCheck className="h-3 w-3" /> Manually settled by ops
            </span>
          )}
        </div>

        {(w.status === "Rejected" || w.status === "Failed") && w.failureReason && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{w.failureReason}</span>
          </div>
        )}

        <Section title="Amount">
          <Row label="Withdrawal" value={formatNgn(w.amount)} />
          <Row label="Fee" value={formatNgn(w.fee)} />
          <Row label="Total" value={formatNgn(w.totalAmount)} strong />
        </Section>

        <Section title="Destination">
          <Row label="Account Name" value={w.accountName} />
          <Row
            label="Bank"
            value={w.bankName ? `${w.bankName}${w.bankCode ? ` (${w.bankCode})` : ""}` : undefined}
          />
          <Row
            label="Account No."
            value={w.accountNumber}
            mono
          />
        </Section>

        <Section title="Reference">
          <Row label="Reference" value={w.reference} mono />
          {w.providerReference && <Row label="Provider Ref." value={w.providerReference} mono />}
          <Row label="Est. arrival" value={w.estimatedArrival} />
        </Section>

        {isPending && (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setRejectOpen(true)} className="flex-1">
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => setApproveOpen(true)} className="flex-1">
              <Check className="h-4 w-4" /> Approve
            </Button>
          </div>
        )}
      </div>

      {/* ── Wallet balances + User info ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Wallet">
          <div className="grid grid-cols-2 gap-2">
            <BalanceCard
              label="Current balance"
              loading={balanceLoading}
              value={currentBalance != null ? money(currentBalance, walletCurrency) : null}
              unavailable={balanceError && currentBalance == null}
            />
            <BalanceCard
              label="Holding balance"
              loading={balanceLoading}
              value={holdingBalance != null ? money(holdingBalance, walletCurrency) : null}
              unavailable={balanceError && holdingBalance == null}
            />
          </div>
          <div className="mt-3 divide-y divide-border rounded-lg border bg-background">
            <Row label="Wallet ID" value={w.walletId ? truncId(w.walletId, 18) : undefined} mono />
          </div>
        </Panel>

        <Panel title="User">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {(user?.displayName ?? w.userName ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <UserRef userId={w.userId} className="block truncate font-semibold leading-tight">
                {user?.displayName ?? w.userName ?? truncId(w.userId)}
              </UserRef>
              {user?.email && (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>
          <div className="mt-3 divide-y divide-border rounded-lg border bg-background">
            {user?.phoneNumber && <Row label="Phone" value={user.phoneNumber} mono />}
            {user?.kycTier && <Row label="KYC Tier" value={user.kycTier} />}
            <Row label="User ID" value={truncId(w.userId, 18)} mono />
          </div>
          <UserRef
            userId={w.userId}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            View user summary <ChevronRight className="h-3 w-3" />
          </UserRef>
        </Panel>
      </div>

      {/* ── Recent transactions ── */}
      <RecentTransactions userId={w.userId} walletId={w.walletId} currentRef={w.reference} />

      <ApproveWithdrawalDialog withdrawal={w} open={approveOpen} onOpenChange={setApproveOpen} />
      <RejectWithdrawalDialog withdrawal={w} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}

/** The user's 10 most recent wallet transactions (admin ledger, keyed by walletId). */
function RecentTransactions({
  userId,
  walletId,
  currentRef,
}: {
  userId: string;
  walletId: string;
  currentRef: string;
}) {
  const { data, isLoading, isError } = useQuery({
    ...walletQueries.transactions(walletId, { pageSize: 10 }),
    enabled: !!walletId,
  });

  const viewAll = (
    <Link
      to="/admin/wallets/withdrawals/all"
      search={{ status: "All", userId }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
    >
      All withdrawals <ChevronRight className="h-3 w-3" />
    </Link>
  );

  return (
    <Panel title="Recent transactions" action={viewAll}>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="flex items-center gap-1.5 py-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Couldn't load transactions for this wallet.
        </p>
      ) : !data?.items.length ? (
        <p className="py-4 text-sm text-muted-foreground">No transactions on record.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.items.map((t) => (
            <TxnRow
              key={t.id}
              txn={t}
              highlight={!!currentRef && t.reference.includes(currentRef)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TxnRow({ txn, highlight }: { txn: AdminWalletTransaction; highlight?: boolean }) {
  const credit = txn.direction?.toLowerCase() === "credit";
  return (
    <li
      className={`flex items-center gap-3 py-2.5 ${highlight ? "rounded-md bg-primary/5 px-2" : ""}`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          credit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}
      >
        {credit ? (
          <ArrowDownLeft className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpRight className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {txn.type}
          {txn.narration ? (
            <span className="font-normal text-muted-foreground"> · {txn.narration}</span>
          ) : null}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {relativeTime(txn.createdAt)} · {txn.status}
        </p>
      </div>
      <span className={`shrink-0 font-mono text-sm font-semibold ${credit ? "text-success" : ""}`}>
        {credit ? "+" : "−"}
        {money(Math.abs(txn.amount), txn.currency)}
      </span>
    </li>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function BalanceCard({
  label,
  value,
  loading,
  unavailable,
}: {
  label: string;
  value: string | null;
  loading?: boolean;
  unavailable?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-secondary/30 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Wallet className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : unavailable ? (
          <span className="text-xs font-normal text-muted-foreground">Unavailable</span>
        ) : (
          (value ?? "—")
        )}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2 divide-y divide-border rounded-lg border bg-background">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={(mono ? "font-mono text-xs " : "") + (strong ? "font-semibold" : "")}>
        {value ?? "—"}
      </span>
    </div>
  );
}
