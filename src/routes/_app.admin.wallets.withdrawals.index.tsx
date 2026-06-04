import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Loader2, RefreshCw,
  TrendingUp, XCircle, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/plut/StatCard";
import { withdrawalQueries } from "@/api/withdrawals";
import { formatNgn } from "@/components/plut/withdrawals/WithdrawalStatusBadge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/admin/wallets/withdrawals/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(withdrawalQueries.summary());
  },
  component: WithdrawalsOverview,
});

function WithdrawalsOverview() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery(withdrawalQueries.summary());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {dataUpdatedAt
              ? `Last updated ${format(new Date(dataUpdatedAt), "HH:mm:ss")}`
              : "Loading…"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      ) : (
        <>
          <PendingApprovalCard
            count={data.pendingApprovalCount}
            amount={data.pendingApprovalAmount}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Awaiting Bank"
              value={String(data.pendingProviderCount)}
              icon={Clock}
              sublabel={formatNgn(data.pendingProviderAmount)}
            />
            <StatCard
              label="Successful"
              value={String(data.successfulCount)}
              icon={CheckCircle2}
              sublabel={formatNgn(data.successfulAmount)}
            />
            <StatCard
              label="Failed"
              value={String(data.failedCount)}
              icon={XCircle}
              sublabel={formatNgn(data.failedAmount)}
            />
            <StatCard
              label="Rejected"
              value={String(data.rejectedCount)}
              icon={Ban}
              sublabel={formatNgn(data.rejectedAmount)}
            />
            <StatCard
              label="Total"
              value={String(data.totalCount)}
              icon={TrendingUp}
              sublabel={formatNgn(data.totalAmount)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function PendingApprovalCard({ count, amount }: { count: number; amount: number }) {
  const empty = count === 0;
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 transition-shadow",
        empty
          ? "border-success/40 bg-success/5"
          : "border-amber-500/40 bg-amber-500/5 shadow-[0_0_0_1px_hsl(38_92%_50%/0.2)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {empty ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {empty ? "All caught up" : "Needs action"}
            </p>
          </div>
          <p className="font-display mt-3 text-[40px] font-bold leading-none">{count}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {empty
              ? "No withdrawals need your attention."
              : `withdrawal${count === 1 ? "" : "s"} pending approval · ${formatNgn(amount)}`}
          </p>
        </div>

        {!empty && (
          <Button asChild>
            <Link
              to="/admin/wallets/withdrawals/all"
              search={{ status: "PendingApproval" }}
            >
              Review Now <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}