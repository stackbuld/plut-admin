import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarIcon, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { vasQueries } from "@/api/vas";
import type { BulkPurchaseStatus, VasBulkBatch } from "@/api/types/vas.types";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { v: BulkPurchaseStatus | "all"; l: string }[] = [
  { v: "all", l: "All statuses" },
  { v: "PendingApproval", l: "Pending Approval" },
  { v: "Pending", l: "Pending" },
  { v: "Validating", l: "Validating" },
  { v: "Processing", l: "Processing" },
  { v: "PartiallyCompleted", l: "Partially Completed" },
  { v: "Completed", l: "Completed" },
  { v: "Failed", l: "Failed" },
  { v: "Cancelled", l: "Cancelled" },
];

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/admin/vas/bulk-purchases/")({
  component: VasBulkBatchesList,
});

function VasBulkBatchesList() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<BulkPurchaseStatus | "all">("all");
  const [businessIdInput, setBusinessIdInput] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => {
      setBusinessId(businessIdInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [businessIdInput]);

  useEffect(() => {
    setPage(1);
  }, [status, dateFrom, dateTo]);

  const listParams = {
    pageNumber: page,
    pageSize,
    ...(status !== "all" ? { status } : {}),
    ...(businessId ? { businessId } : {}),
    ...(dateFrom ? { from: new Date(dateFrom).toISOString() } : {}),
    ...(dateTo ? { to: new Date(dateTo + "T23:59:59").toISOString() } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(vasQueries.bulkBatchList(listParams));

  useEffect(() => {
    if (data && page * pageSize < data.totalCount) {
      qc.prefetchQuery(vasQueries.bulkBatchList({ ...listParams, pageNumber: page + 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, pageSize, status, businessId, dateFrom, dateTo, qc]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={businessIdInput}
            onChange={(e) => setBusinessIdInput(e.target.value)}
            placeholder="Filter by business id"
            className="h-9 pl-9 font-mono text-xs"
          />
        </div>

        <FilterSelect
          value={status}
          onChange={(v) => setStatus(v as BulkPurchaseStatus | "all")}
          placeholder="Status"
          options={STATUS_OPTIONS.map((o) => ({ v: o.v, l: o.l }))}
        />

        <button
          type="button"
          onClick={() => setStatus(status === "PendingApproval" ? "all" : "PendingApproval")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            status === "PendingApproval"
              ? "bg-amber-500 text-white"
              : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400",
          )}
        >
          Stuck in Pending Approval
        </button>

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
            : `${(data?.totalCount ?? 0).toLocaleString()} batch${(data?.totalCount ?? 0) === 1 ? "" : "es"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No bulk purchase batches found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <BatchRow key={b.id} batch={b} />
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
          noun="batch"
        />
      )}
    </div>
  );
}

const STATUS_STYLES: Record<BulkPurchaseStatus, string> = {
  PendingApproval: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400",
  Pending: "bg-secondary text-foreground",
  Validating: "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-400",
  Processing: "bg-blue-500/15 text-blue-600 ring-1 ring-blue-500/30 dark:text-blue-400",
  PartiallyCompleted: "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400",
  Completed: "bg-success/15 text-success ring-1 ring-success/30",
  Failed: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  Cancelled: "bg-muted text-muted-foreground ring-1 ring-border",
};

function BatchRow({ batch: b }: { batch: VasBulkBatch }) {
  return (
    <Link
      to="/admin/vas/bulk-purchases/$batchId"
      params={{ batchId: b.id }}
      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{b.batchName}</p>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
              STATUS_STYLES[b.status],
            )}
          >
            {b.status}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {b.batchReference ? truncId(b.batchReference, 22) : truncId(b.id)} ·{" "}
          {relativeTime(b.createdAt)}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {b.totalItemCount} item{b.totalItemCount === 1 ? "" : "s"} · {b.successCount} succeeded ·{" "}
          {b.failureCount} failed
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-base font-semibold">
          {formatVasAmount(b.totalEstimatedAmount, b.currencyCode)}
        </p>
        <p className="text-[11px] text-muted-foreground">estimated total</p>
      </div>
    </Link>
  );
}
