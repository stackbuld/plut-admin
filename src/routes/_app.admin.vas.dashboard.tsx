import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Loader2, RefreshCw, TrendingUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/plut/StatCard";
import { vasQueries } from "@/api/vas";
import { VasProviderStatusBadge, formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/admin/vas/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(vasQueries.dashboard());
  },
  component: VasDashboard,
});

function VasDashboard() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery(vasQueries.dashboard());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {dataUpdatedAt
            ? `Last updated ${format(new Date(dataUpdatedAt), "HH:mm:ss")}`
            : "Loading…"}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Transactions (24h)"
              value={String(data.transactionsLast24h)}
              icon={Activity}
            />
            <StatCard
              label="Success Rate (24h)"
              value={`${data.successRatePercent}%`}
              icon={CheckCircle2}
              sublabel={`${data.successfulLast24h} successful`}
            />
            <StatCard
              label="Volume (24h)"
              value={formatVasAmount(data.volumeLast24h)}
              icon={TrendingUp}
              sublabel="Successful transactions only"
            />
            <StatCard label="Failed (24h)" value={String(data.failedLast24h)} icon={XCircle} />
          </div>

          <section className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Provider health
            </h3>
            {data.providers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No providers configured.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.providers.map((p) => (
                  <Link
                    key={p.code}
                    to="/admin/vas/providers"
                    className="flex items-center justify-between rounded-xl border bg-background px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.code}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.currentSuccessRate != null
                          ? `${p.currentSuccessRate}% success`
                          : "No data yet"}
                        {!p.isActive && " · inactive"}
                      </p>
                    </div>
                    <VasProviderStatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
