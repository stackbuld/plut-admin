import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, CalendarIcon, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { withdrawalQueries } from "@/api/withdrawals";
import type { AdminWithdrawal, WithdrawalStatus } from "@/api/types/withdrawals.types";
import { WithdrawalStatusBadge, formatNgn, maskAccount } from "@/components/plut/withdrawals/WithdrawalStatusBadge";
import { ApproveWithdrawalDialog } from "@/components/plut/withdrawals/ApproveWithdrawalDialog";
import { RejectWithdrawalDialog } from "@/components/plut/withdrawals/RejectWithdrawalDialog";
import { relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TablePager } from "@/components/plut/catalog-shared";

const STATUS_OPTIONS: (WithdrawalStatus | "All")[] = [
  "All", "PendingApproval", "PendingProvider", "Successful", "Failed", "Rejected",
];

const DEFAULT_PAGE_SIZE = 20;

type SearchState = { status?: WithdrawalStatus | "All" };

export const Route = createFileRoute("/_app/admin/wallets/withdrawals/all")({
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    status: (STATUS_OPTIONS as string[]).includes(s.status as string)
      ? (s.status as WithdrawalStatus | "All")
      : "All",
  }),
  component: WithdrawalsList,
});

function WithdrawalsList() {
  const { status = "All" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState(""); // debounced search sent to API
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [toApprove, setToApprove] = useState<AdminWithdrawal | null>(null);
  const [toReject, setToReject] = useState<AdminWithdrawal | null>(null);

  // Debounce search input → query (400ms)
  useEffect(() => {
    const t = setTimeout(() => { setQuery(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [status, dateFrom, dateTo]);

  const listParams = {
    status,
    page,
    pageSize,
    ...(query ? { query } : {}),
    ...(dateFrom ? { dateFrom: new Date(dateFrom).toISOString() } : {}),
    ...(dateTo ? { dateTo: new Date(dateTo + "T23:59:59").toISOString() } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(
    withdrawalQueries.list(listParams),
  );
  const { data: summary } = useQuery(withdrawalQueries.summary());

  // Prefetch next page
  useEffect(() => {
    if (data && page < (data.totalPages ?? 1)) {
      qc.prefetchQuery(withdrawalQueries.list({ ...listParams, page: page + 1 }));
    }
  }, [data, page, pageSize, status, query, dateFrom, dateTo, qc]);

  const counts: Record<WithdrawalStatus | "All", number> = useMemo(() => ({
    All: summary?.totalCount ?? 0,
    PendingApproval: summary?.pendingApprovalCount ?? 0,
    PendingProvider: summary?.pendingProviderCount ?? 0,
    Successful: summary?.successfulCount ?? 0,
    Failed: summary?.failedCount ?? 0,
    Rejected: summary?.rejectedCount ?? 0,
    Initiated: 0,
    PendingLedger: 0,
    Reversed: 0,
  }), [summary]);

  const items = data?.items ?? [];
  const pending = items.filter((w) => w.status === "PendingApproval");
  const others = items.filter((w) => w.status !== "PendingApproval");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {STATUS_OPTIONS.map((s) => {
          const active = status === s;
          const count = counts[s] ?? 0;
          const isAttention = s === "PendingApproval" && count > 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => navigate({ search: { status: s } })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              {s === "All" ? "All" : prettyStatus(s)}
              <span className={cn(
                "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : isAttention
                  ? "bg-red-500 text-white"
                  : "bg-background text-muted-foreground",
              )}>
                {count > 99 ? "99+" : count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user, reference or account no."
            className="h-9 pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[140px] text-xs"
            title="From date"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="h-9 w-[140px] text-xs"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {isLoading ? "Loading…" : `${(data?.totalCount ?? 0).toLocaleString()} withdrawal${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Section title="Needs approval" tone="amber">
              {pending.map((w) => (
                <Row
                  key={w.withdrawalId}
                  w={w}
                  onApprove={() => setToApprove(w)}
                  onReject={() => setToReject(w)}
                />
              ))}
            </Section>
          )}
          {others.length > 0 && (
            <Section title={pending.length > 0 ? "Other withdrawals" : "Withdrawals"}>
              {others.map((w) => <Row key={w.withdrawalId} w={w} />)}
            </Section>
          )}
        </div>
      )}

      {!isLoading && (data?.totalCount ?? 0) > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
          noun="withdrawal"
        />
      )}

      <ApproveWithdrawalDialog
        withdrawal={toApprove}
        open={!!toApprove}
        onOpenChange={(o) => !o && setToApprove(null)}
      />
      <RejectWithdrawalDialog
        withdrawal={toReject}
        open={!!toReject}
        onOpenChange={(o) => !o && setToReject(null)}
      />
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone?: "amber"; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className={cn(
        "text-[11px] font-bold uppercase tracking-wider",
        tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      )}>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  w, onApprove, onReject,
}: { w: AdminWithdrawal; onApprove?: () => void; onReject?: () => void }) {
  const isPending = w.status === "PendingApproval";
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors",
        isPending && "border-amber-500/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          to="/admin/wallets/withdrawals/$withdrawalId"
          params={{ withdrawalId: w.withdrawalId }}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{w.userName}</p>
            <WithdrawalStatusBadge status={w.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {w.bankName ?? "—"} · {w.accountNumber ? maskAccount(w.accountNumber) : "—"}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {truncId(w.reference, 22)} · {w.createdAt ? relativeTime(w.createdAt) : "—"}
          </p>
        </Link>

        <div className="text-right">
          <p className="font-mono text-base font-semibold">{formatNgn(w.totalAmount)}</p>
          <p className="text-[11px] text-muted-foreground">fee {formatNgn(w.fee)}</p>
        </div>
      </div>

      {isPending && onApprove && onReject && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            onClick={onApprove}
            aria-label={`Approve withdrawal for ${w.userName}, ${formatNgn(w.totalAmount)}`}
            className="flex-1"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            aria-label={`Reject withdrawal for ${w.userName}, ${formatNgn(w.totalAmount)}`}
            className="flex-1"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ status }: { status: WithdrawalStatus | "All" }) {
  const allClear = status === "PendingApproval";
  return (
    <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      {allClear
        ? "✅ All caught up — no withdrawals need your attention."
        : "No withdrawals found for the selected filters. Try adjusting the date range or status."}
    </div>
  );
}

function prettyStatus(s: WithdrawalStatus): string {
  switch (s) {
    case "PendingApproval": return "Pending Approval";
    case "PendingProvider": return "Awaiting Bank";
    case "PendingLedger":   return "Pending Ledger";
    default: return s;
  }
}
