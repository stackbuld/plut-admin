import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarIcon, Loader2, RefreshCw, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cryptoTransactionQueries } from "@/api/crypto-transactions";
import { cryptoAssetQueries } from "@/api/crypto-assets";
import type {
  CryptoTransactionListItemDto,
  CryptoTransactionStatus,
  CryptoTransactionsSummaryDto,
  CryptoTransactionType,
} from "@/api/types/crypto-transactions.types";
import { CryptoTransactionStatusBadge } from "@/components/plut/crypto/CryptoTransactionStatusBadge";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { relativeTime, truncId, formatUsd } from "@/lib/format";

// Type/status options enumerate the actual CryptoTransactionType/CryptoTransactionStatus enum
// values (crypto-service Domain/Enums/Enums.cs) — every ledger event kind and lifecycle state that
// exists, not a guessed subset (05-TRANSACTIONS_EXPLORER.md §3).
const TYPE_OPTIONS: { v: string; l: string }[] = [
  { v: "all", l: "All types" },
  { v: "Deposit", l: "Deposit" },
  { v: "Withdrawal", l: "Withdrawal" },
  { v: "Buy", l: "Buy" },
  { v: "Sell", l: "Sell" },
  { v: "Swap", l: "Swap" },
  { v: "FeeDebit", l: "Fee Debit" },
  { v: "Reversal", l: "Reversal" },
];

const STATUS_OPTIONS: { v: string; l: string }[] = [
  { v: "all", l: "All statuses" },
  { v: "Pending", l: "Pending" },
  { v: "AwaitingConfirmation", l: "Awaiting Confirmation" },
  { v: "Successful", l: "Successful" },
  { v: "Failed", l: "Failed" },
  { v: "Reversed", l: "Reversed" },
];

const DEFAULT_PAGE_SIZE = 50;

// SUMMARY_TILES drives the summary strip — same five operation types the backend's
// CryptoTransactionsSummaryDto returns (deposit/withdrawal/buy/sell/swap). FeeDebit/Reversal are
// deliberately not summarized here — the doc's own summary shape (§3) only covers these five.
const SUMMARY_TILES: { key: "deposit" | "withdrawal" | "buy" | "sell" | "swap"; label: string }[] = [
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "buy", label: "Buys" },
  { key: "sell", label: "Sells" },
  { key: "swap", label: "Swaps" },
];

type SearchState = { userId?: string };

export const Route = createFileRoute("/_app/admin/crypto/transactions/")({
  // userId is URL-persisted so other screens (e.g. a user's wallet page) can deep-link straight
  // into this user's transaction history via `?userId=...` — read once as this list's initial
  // filter value (05-TRANSACTIONS_EXPLORER.md doesn't ask for continuous two-way URL sync beyond
  // that, so the filter itself lives in local state afterward, same as every other filter here).
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    userId: typeof s.userId === "string" && s.userId ? s.userId : undefined,
  }),
  component: CryptoTransactionsList,
});

function CryptoTransactionsList() {
  const { userId: userIdParam } = Route.useSearch();

  const [userIdInput, setUserIdInput] = useState(userIdParam ?? "");
  const [userId, setUserId] = useState(userIdParam ?? "");
  const [asset, setAsset] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => {
      setUserId(userIdInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [userIdInput]);

  useEffect(() => {
    setPage(1);
  }, [asset, type, status, dateFrom, dateTo]);

  // The summary strip shares the same date range as the table below it — one coherent "what
  // happened in this window" view rather than two independently-filterable widgets. Left blank,
  // both the list and the summary endpoint fall back to their own server-side defaults (the
  // summary defaults to the last 7 days per 05-TRANSACTIONS_EXPLORER.md §3; the list has no
  // implicit date filter at all).
  const dateRangeParams = {
    ...(dateFrom ? { from: new Date(dateFrom).toISOString() } : {}),
    ...(dateTo ? { to: new Date(dateTo + "T23:59:59").toISOString() } : {}),
  };

  const listParams = {
    ...(userId ? { userId } : {}),
    ...(asset !== "all" ? { asset } : {}),
    ...(type !== "all" ? { type: type as CryptoTransactionType } : {}),
    ...(status !== "all" ? { status: status as CryptoTransactionStatus } : {}),
    ...dateRangeParams,
    page,
    pageSize,
  };

  const { data, isLoading, isFetching, refetch } = useQuery(
    cryptoTransactionQueries.list(listParams),
  );
  const { data: summary, isLoading: summaryLoading } = useQuery(
    cryptoTransactionQueries.summary(dateRangeParams),
  );
  const { data: assets } = useQuery(cryptoAssetQueries.list());

  const assetOptions: { v: string; l: string }[] = [
    { v: "all", l: "All assets" },
    ...(assets ?? []).map((a) => ({ v: a.asset, l: a.asset })),
  ];

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Transactions</h1>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      <SummaryStrip summary={summary} isLoading={summaryLoading} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="Filter by user id"
            className="h-9 pl-9 font-mono text-xs"
          />
        </div>

        <FilterSelect value={type} onChange={setType} placeholder="Type" options={TYPE_OPTIONS} />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="Status"
          options={STATUS_OPTIONS}
        />
        <FilterSelect value={asset} onChange={setAsset} placeholder="Asset" options={assetOptions} />

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {isLoading
            ? "Loading…"
            : `${(data?.totalCount ?? 0).toLocaleString()} transaction${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No transactions match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Fee (Platform+Spread)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (data?.totalCount ?? 0) > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
          noun="transaction"
        />
      )}
    </div>
  );
}

function SummaryStrip({
  summary,
  isLoading,
}: {
  summary: CryptoTransactionsSummaryDto | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {SUMMARY_TILES.map((t) => {
        const s = summary?.[t.key];
        return (
          <div key={t.key} className="rounded-2xl border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t.label}
            </p>
            {isLoading ? (
              <div className="mt-2 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <p className="mt-1 text-lg font-semibold">{formatUsd(s?.totalUsdEquivalent ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {(s?.count ?? 0).toLocaleString()} tx
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TransactionRow({ tx }: { tx: CryptoTransactionListItemDto }) {
  return (
    <tr className="transition-colors hover:bg-secondary/30">
      <td className="px-4 py-3">
        <Link
          to="/admin/crypto/transactions/$transactionId"
          params={{ transactionId: tx.id }}
          className="font-semibold hover:underline"
        >
          {tx.type}
        </Link>
        <p className="text-[11px] text-muted-foreground">{tx.direction}</p>
      </td>
      <td className="px-4 py-3">
        <UserRef userId={tx.userId} className="font-mono text-xs text-primary hover:underline">
          {truncId(tx.userId, 14)}
        </UserRef>
      </td>
      <td className="px-4 py-3 font-medium">{tx.asset}</td>
      <td className="px-4 py-3 text-right font-mono text-xs">
        {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
        {formatUsd(tx.platformFee)} + {tx.spreadFee > 0 ? formatUsd(tx.spreadFee) : "—"}
      </td>
      <td className="px-4 py-3">
        <CryptoTransactionStatusBadge status={tx.status} />
      </td>
      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
        {relativeTime(tx.createdAt)}
      </td>
    </tr>
  );
}
