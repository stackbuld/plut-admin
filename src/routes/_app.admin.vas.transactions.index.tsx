import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarIcon, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { vasQueries } from "@/api/vas";
import type { VasAdminTransaction, VasTransactionStatus } from "@/api/types/vas.types";
import { VasTransactionStatusBadge, formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { relativeTime, truncId } from "@/lib/format";

const STATUS_OPTIONS: (VasTransactionStatus | "All")[] = [
  "All",
  "Initiated",
  "PendingProvider",
  "PendingResolution",
  "Successful",
  "Failed",
  "Refunded",
];

const CATEGORY_OPTIONS = [
  { v: "all", l: "All categories" },
  { v: "airtime", l: "Airtime" },
  { v: "mobile-data", l: "Mobile Data" },
  { v: "electricity", l: "Electricity" },
  { v: "cable-tv", l: "Cable TV" },
  { v: "betting", l: "Betting" },
  { v: "epin", l: "e-PIN" },
  { v: "internet", l: "Internet" },
];

const DEFAULT_PAGE_SIZE = 20;

type SearchState = { status?: VasTransactionStatus | "All" };

export const Route = createFileRoute("/_app/admin/vas/transactions/")({
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    status: (STATUS_OPTIONS as string[]).includes(s.status as string)
      ? (s.status as VasTransactionStatus | "All")
      : "All",
  }),
  component: VasTransactionsList,
});

function VasTransactionsList() {
  const { status = "All" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [reference, setReference] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => {
      setReference(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [status, category, dateFrom, dateTo]);

  const listParams = {
    status,
    pageNumber: page,
    pageSize,
    ...(category !== "all" ? { serviceCategoryId: category } : {}),
    ...(reference ? { reference } : {}),
    ...(dateFrom ? { from: new Date(dateFrom).toISOString() } : {}),
    ...(dateTo ? { to: new Date(dateTo + "T23:59:59").toISOString() } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(vasQueries.transactionList(listParams));

  useEffect(() => {
    if (data && page * pageSize < data.totalCount) {
      qc.prefetchQuery(vasQueries.transactionList({ ...listParams, pageNumber: page + 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, pageSize, status, category, reference, dateFrom, dateTo, qc]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => navigate({ search: { status: s } })}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (status === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground")
            }
          >
            {s === "All" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by reference"
            className="h-9 pl-9"
          />
        </div>

        <FilterSelect
          value={category}
          onChange={setCategory}
          placeholder="Category"
          options={CATEGORY_OPTIONS}
        />

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
          No transactions found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <TransactionRow key={t.id} t={t} />
          ))}
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

function TransactionRow({ t }: { t: VasAdminTransaction }) {
  return (
    <Link
      to="/admin/vas/transactions/$transactionId"
      params={{ transactionId: t.id }}
      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <UserRef userId={t.userId} className="truncate text-sm font-semibold">
            {truncId(t.userId)}
          </UserRef>
          <VasTransactionStatusBadge status={t.status} />
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {t.serviceCategoryId}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t.customerIdentifierValue}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {truncId(t.reference, 22)} · {relativeTime(t.created)}
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-base font-semibold">
          {formatVasAmount(t.amount, t.currencyCode)}
        </p>
        {t.commissionEarned != null && (
          <p className="text-[11px] text-muted-foreground">
            commission {formatVasAmount(t.commissionEarned, t.currencyCode)}
          </p>
        )}
      </div>
    </Link>
  );
}
