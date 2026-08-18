import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { vasQueries } from "@/api/vas";
import type { VasSchedule } from "@/api/types/vas.types";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime, relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export const Route = createFileRoute("/_app/admin/vas/schedules/")({
  component: VasSchedulesList,
});

function VasSchedulesList() {
  const qc = useQueryClient();
  const [userIdInput, setUserIdInput] = useState("");
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("all");
  const [needsAttention, setNeedsAttention] = useState(false);
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
  }, [category, needsAttention]);

  const listParams = {
    pageNumber: page,
    pageSize,
    ...(userId ? { userId } : {}),
    ...(category !== "all" ? { service: category } : {}),
    ...(needsAttention ? { isActive: false } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(vasQueries.scheduleList(listParams));

  useEffect(() => {
    if (data && page * pageSize < data.totalCount) {
      qc.prefetchQuery(vasQueries.scheduleList({ ...listParams, pageNumber: page + 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, pageSize, userId, category, needsAttention, qc]);

  const items = useMemo(() => {
    const all = data?.items ?? [];
    if (!needsAttention) return all;
    // Backend only supports an isActive=false filter — refine to schedules auto-disabled by
    // failures (not manually cancelled) or paused because a plan/price changed underneath them.
    return all.filter(
      (s) =>
        (!s.isCancelled && s.failureCount > 0) ||
        s.lastRunStatus === "plan_unavailable" ||
        s.lastRunStatus === "price_changed",
    );
  }, [data, needsAttention]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="Filter by user id"
            className="h-9 pl-9 font-mono text-xs"
          />
        </div>

        <FilterSelect
          value={category}
          onChange={setCategory}
          placeholder="Category"
          options={CATEGORY_OPTIONS}
        />

        <button
          type="button"
          onClick={() => setNeedsAttention((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            needsAttention
              ? "bg-amber-500 text-white"
              : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400",
          )}
        >
          <AlertTriangle className="h-3 w-3" /> Needs attention
        </button>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {isLoading
            ? "Loading…"
            : `${(needsAttention ? items.length : (data?.totalCount ?? 0)).toLocaleString()} schedule${
                (data?.totalCount ?? 0) === 1 ? "" : "s"
              }`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No schedules found for the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <ScheduleRow key={s.id} s={s} />
          ))}
        </div>
      )}

      {!isLoading && !needsAttention && (data?.totalCount ?? 0) > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
          noun="schedule"
        />
      )}
    </div>
  );
}

function ScheduleRow({ s }: { s: VasSchedule }) {
  const autoDisabled = !s.isActive && !s.isCancelled && s.failureCount > 0;
  return (
    <Link
      to="/admin/vas/schedules/$scheduleId"
      params={{ scheduleId: s.id }}
      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <UserRef userId={s.userId} className="truncate text-sm font-semibold">
            {s.nickname ?? truncId(s.userId)}
          </UserRef>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {s.serviceCategoryId}
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {s.frequency}
          </span>
          {s.isCancelled && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              cancelled
            </span>
          )}
          {autoDisabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" /> auto-disabled
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{s.customerIdentifierValue}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {s.failureCount > 0
            ? `${s.failureCount} failure${s.failureCount === 1 ? "" : "s"} · `
            : ""}
          next {formatDateTime(s.nextRunDate)}
          {s.lastRunDate
            ? ` · last run ${relativeTime(s.lastRunDate)} (${s.lastRunStatus ?? "unknown"})`
            : ""}
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-base font-semibold">
          {formatVasAmount(s.amount, s.currencyCode)}
        </p>
        <p className="text-[11px] text-muted-foreground">{s.isActive ? "active" : "inactive"}</p>
      </div>
    </Link>
  );
}
