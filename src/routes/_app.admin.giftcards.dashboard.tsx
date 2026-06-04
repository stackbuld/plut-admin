import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, AlertTriangle, Gift, Activity, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { StatCard } from "@/components/plut/StatCard";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { tradeQueries } from "@/api";
import { format, parseISO } from "date-fns";
import { formatNaira, relativeTime, truncId, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/giftcards/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Plut Admin" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery(tradeQueries.stats());
  const { data: pendingData } = useQuery(tradeQueries.list({ Status: "Submitted", PageSize: 50 }));

  const pending = pendingData?.items ?? [];
  const pendingCount = stats?.pendingReview ?? pendingData?.totalCount ?? 0;
  const pastSlaCount = stats?.pastSla ?? 0;
  const paidCount = stats?.totalPaid ?? 0;
  const rejectedCount = stats?.totalRejected ?? 0;
  const activeBrands = stats?.activeBrands ?? 0;
  const avgReviewMin = stats?.avgReviewSeconds != null
    ? formatDuration(stats.avgReviewSeconds)
    : "—";

  const queue = [...pending]
    .sort((a, b) => parseISO(a.submittedAt).getTime() - parseISO(b.submittedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">Today · {format(new Date(), "dd MMM yyyy")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PriorityCard label="Pending Review" value={pendingCount} unit="trades" tone={pendingCount > 0 ? "danger" : "ok"}
          cta={{ to: "/admin/giftcards/trades", label: "Review Now" }} icon={Clock} />
        <PriorityCard label="Past SLA" value={pastSlaCount} unit="trades need attention" tone={pastSlaCount > 0 ? "danger" : "ok"}
          cta={{ to: "/admin/giftcards/trades", label: "View Now" }} icon={AlertTriangle} pulse />
        <StatCard label="Total Paid" value={String(paidCount)} icon={CheckCircle2} sublabel="all time" />
        <StatCard label="Total Rejected" value={String(rejectedCount)} icon={XCircle} sublabel="all time" />
        <StatCard label="Active Brands" value={String(activeBrands)} icon={Gift} sublabel="live brands" />
        <StatCard label="Avg Review Time" value={avgReviewMin} icon={Activity} sublabel="last completed trades" />
      </div>

      <section className="rounded-2xl border bg-card">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-base font-bold">Pending Review Queue</h2>
            <p className="text-xs text-muted-foreground">Oldest first</p>
          </div>
          <Link to="/admin/giftcards/trades" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </header>

        {pendingData === undefined ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : queue.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-success">All trades reviewed — queue is clear ✓</div>
        ) : (
          <>
            {/* Mobile */}
            <ul className="divide-y divide-border md:hidden">
              {queue.map((t) => (
                <li key={t.id}>
                  <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-secondary/40">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium">{truncId(t.id)}</p>
                      <p className="text-xs text-muted-foreground">{t.itemCount} item{t.itemCount !== 1 ? "s" : ""} · {relativeTime(t.submittedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">{t.totalCustomerPayoutAmount.toLocaleString()} {t.payoutCurrency}</p>
                      <div className="mt-0.5"><SlaIndicator deadlineIso={t.slaDeadlineAt} /></div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    {["ID", "Items", "Payout", "Submitted", "SLA"].map((h) => (
                      <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                      <td className="px-6 py-3.5 font-mono text-xs">
                        <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="hover:text-primary">{truncId(t.id)}</Link>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">{t.itemCount} item{t.itemCount !== 1 ? "s" : ""}</td>
                      <td className="px-6 py-3.5 font-mono font-semibold text-right">{t.totalCustomerPayoutAmount.toLocaleString()} {t.payoutCurrency}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{relativeTime(t.submittedAt)}</td>
                      <td className="px-6 py-3.5"><SlaIndicator deadlineIso={t.slaDeadlineAt} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function PriorityCard({ label, value, unit, tone, cta, icon: Icon, pulse }: {
  label: string; value: number; unit: string; tone: "danger" | "ok";
  cta: { to: string; label: string }; icon: typeof Clock; pulse?: boolean;
}) {
  const danger = tone === "danger";
  return (
    <div className={cn(
      "rounded-2xl border bg-card p-6 transition-shadow",
      danger ? "border-red-500/40 shadow-[0_0_0_1px_hsl(0_84%_62%/0.2)]" : "",
      pulse && danger ? "animate-pulse-subtle" : "",
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display mt-3 text-[40px] font-bold leading-none">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{unit}</p>
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl", danger ? "bg-red-500/15 text-red-500" : "bg-primary/12 text-primary")}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <Link to={cta.to} className={cn("mt-5 inline-flex items-center gap-1 text-xs font-semibold hover:underline", danger ? "text-red-500" : "text-primary")}>
        {cta.label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
