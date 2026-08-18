import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { vasQueries } from "@/api/vas";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { TablePager } from "@/components/plut/catalog-shared";
import { formatDateTime, relativeTime, truncId } from "@/lib/format";

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/admin/vas/security")({
  head: () => ({ meta: [{ title: "VAS Fraud & Security — Plut Admin" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(
      vasQueries.securityFlagList({ activeOnly: true, pageNumber: 1, pageSize: DEFAULT_PAGE_SIZE }),
    );
  },
  component: VasSecurityFlagsList,
});

function VasSecurityFlagsList() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeOnly, dateFrom, dateTo]);

  const listParams = {
    activeOnly,
    pageNumber: page,
    pageSize,
    ...(dateFrom ? { from: new Date(dateFrom).toISOString() } : {}),
    ...(dateTo ? { to: new Date(dateTo + "T23:59:59").toISOString() } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(vasQueries.securityFlagList(listParams));

  useEffect(() => {
    if (data && page * pageSize < data.totalCount) {
      qc.prefetchQuery(vasQueries.securityFlagList({ ...listParams, pageNumber: page + 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, pageSize, activeOnly, dateFrom, dateTo, qc]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
          <span className="text-sm text-muted-foreground">Active flags only</span>
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
            : `${(data?.totalCount ?? 0).toLocaleString()} flag${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No security flags found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Flagged at</th>
                <th className="px-4 py-3 font-medium">Flagged until</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((f) => (
                <tr key={f.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <UserRef userId={f.userId} className="font-mono text-xs">
                      {truncId(f.userId)}
                    </UserRef>
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">{f.reason}</td>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground"
                    title={formatDateTime(f.flaggedAt)}
                  >
                    {relativeTime(f.flaggedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(f.flaggedUntil)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                        (f.isActive
                          ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
                          : "bg-muted text-muted-foreground ring-1 ring-border")
                      }
                    >
                      {f.isActive ? "Active" : "Expired"}
                    </span>
                  </td>
                </tr>
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
          noun="flag"
        />
      )}
    </div>
  );
}
