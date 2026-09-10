import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bitcoin,
  Loader2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  cryptoQueries,
  cryptoDepositQueries,
  cryptoTransactionQueries,
  cryptoRevenueQueries,
  cryptoSystemHealthQueries,
} from "@/api";
import { cryptoWithdrawalQueries } from "@/api/crypto-withdrawals";
import { cryptoOperationQueries } from "@/api/crypto-operations";
import { formatUsd, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Composed client-side from existing screens' own endpoints — no single aggregate endpoint exists
// yet. See docs/wallet-service-docs/crypto-wallet/admin-console/01-DASHBOARD.md: this page is
// deliberately built last (after the screens it links to) and issues several parallel requests
// rather than waiting on a combined backend endpoint. Every tile routes to the screen that owns
// the full picture; this page only summarizes.

export const Route = createFileRoute("/_app/admin/crypto/dashboard")({
  head: () => ({ meta: [{ title: "Crypto Dashboard — Plut Admin" }] }),
  component: CryptoDashboard,
});

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function CryptoDashboard() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Is anything on fire, and how much money moved today.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <NeedsAttentionCard />
        <TodaysVolumeCard />
        <RevenueCard />
      </div>

      <SystemHealthCard />
      <SubAccountsCard />
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  linkTo,
  linkLabel,
  children,
}: {
  title: string;
  icon: React.ElementType;
  linkTo?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h3>
      </div>
      {children}
      {linkTo && (
        <Link
          to={linkTo}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {linkLabel ?? "View"} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function NeedsAttentionCard() {
  const { data: pendingWithdrawals } = useQuery(cryptoWithdrawalQueries.list({ pendingOnly: true }));
  const { data: failedOps } = useQuery(cryptoOperationQueries.failedCount());
  const { data: unmatchedDeposits } = useQuery(cryptoDepositQueries.unmatchedList());

  const pendingWdCount = pendingWithdrawals?.length ?? 0;
  const failedOpsCount = failedOps?.totalCount ?? 0;
  const unmatchedCount = unmatchedDeposits?.length ?? 0;
  const total = pendingWdCount + failedOpsCount + unmatchedCount;

  const rows = [
    {
      count: pendingWdCount,
      label: pendingWdCount === 1 ? "pending withdrawal" : "pending withdrawals",
      to: "/admin/crypto/withdrawals",
    },
    {
      count: failedOpsCount,
      label: failedOpsCount === 1 ? "failed operation" : "failed operations",
      to: "/admin/crypto/operations",
    },
    {
      count: unmatchedCount,
      label: unmatchedCount === 1 ? "unmatched deposit" : "unmatched deposits",
      to: "/admin/crypto/deposits",
    },
  ].filter((r) => r.count > 0);

  return (
    <Panel title="Needs Attention" icon={AlertTriangle}>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label}>
              <Link
                to={r.to}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm hover:bg-secondary"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="font-semibold">{r.count}</span>
                <span className="text-muted-foreground">{r.label}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TodaysVolumeCard() {
  const { data: summary } = useQuery(
    cryptoTransactionQueries.summary({ from: startOfTodayUtc(), to: new Date().toISOString() }),
  );

  const rows: { label: string; count: number; total: number }[] = summary
    ? [
        { label: "Deposits", count: summary.deposit.count, total: summary.deposit.totalUsdEquivalent },
        { label: "Withdrawals", count: summary.withdrawal.count, total: summary.withdrawal.totalUsdEquivalent },
        { label: "Buy", count: summary.buy.count, total: summary.buy.totalUsdEquivalent },
        { label: "Sell", count: summary.sell.count, total: summary.sell.totalUsdEquivalent },
        { label: "Swap", count: summary.swap.count, total: summary.swap.totalUsdEquivalent },
      ]
    : [];

  return (
    <Panel title="Today's Volume" icon={Banknote} linkTo="/admin/crypto/transactions" linkLabel="Transactions">
      {!summary ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <ul className="space-y-1.5 text-sm">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium">
                {r.count} · {formatUsd(r.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RevenueCard() {
  const { data: revenue } = useQuery(cryptoRevenueQueries.report());
  const total = (revenue?.totalSpread ?? 0) + (revenue?.totalPlatformFee ?? 0);

  return (
    <Panel title="Revenue (7d)" icon={TrendingUp} linkTo="/admin/crypto/revenue" linkLabel="Revenue Reports">
      {!revenue ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Spread</span>
            <span className="font-medium">{formatUsd(revenue.totalSpread)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Platform fees</span>
            <span className="font-medium">{formatUsd(revenue.totalPlatformFee)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-base font-bold">{formatUsd(total)}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

const HEALTH_DOT: Record<string, string> = {
  Healthy: "bg-success",
  Degraded: "bg-amber-500",
  Stalled: "bg-destructive",
  Disabled: "bg-muted-foreground/40",
};

function SystemHealthCard() {
  const { data: workers } = useQuery(cryptoSystemHealthQueries.workers());
  const unhealthy = workers?.filter((w) => w.status === "Degraded" || w.status === "Stalled") ?? [];

  return (
    <Panel title="System Health" icon={ShieldAlert} linkTo="/admin/crypto/system-health" linkLabel="System Health">
      {!workers ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {workers.map((w) => (
            <div key={w.name} className="flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", HEALTH_DOT[w.status] ?? "bg-muted-foreground/40")} />
              <span className="text-muted-foreground">{w.name}:</span>
              <span className="font-medium">
                {w.status === "Disabled"
                  ? "disabled"
                  : w.lastRunAt
                    ? `last run ${relativeTime(w.lastRunAt)}`
                    : "never run"}
              </span>
            </div>
          ))}
        </div>
      )}
      {unhealthy.length > 0 && (
        <p className="mt-3 text-xs font-medium text-destructive">
          {unhealthy.length} worker{unhealthy.length === 1 ? "" : "s"} degraded or stalled.
        </p>
      )}
    </Panel>
  );
}

function SubAccountsCard() {
  // No status filter exists on the sub-accounts list endpoint (00-DASHBOARD.md §3's documented
  // gap) — this counts within the most recent page rather than the whole table, and is
  // deliberately approximate; the tile links straight to the full, filterable screen.
  const { data } = useQuery(cryptoQueries.list({ pageSize: 100 }));
  const items = data?.items ?? [];
  const activeCount = items.filter((s) => s.status === "Active").length;
  const stuckCount = items.filter((s) => s.status === "PendingProvisioning").length;

  return (
    <Panel
      title="Sub-Account Provisioning"
      icon={Bitcoin}
      linkTo="/admin/crypto/subaccounts"
      linkLabel="Sub-Accounts"
    >
      {!data ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <p className="text-sm">
          <span className="font-semibold">{activeCount}</span>{" "}
          <span className="text-muted-foreground">active</span>
          {stuckCount > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-amber-500">{stuckCount}</span>{" "}
              <span className="text-muted-foreground">stuck in provisioning</span>
            </>
          )}
          {data.totalCount > items.length && (
            <span className="text-muted-foreground"> (of {data.totalCount} total, most recent {items.length} shown)</span>
          )}
        </p>
      )}
    </Panel>
  );
}
