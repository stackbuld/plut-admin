import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, AlertTriangle, Gift, Activity, CheckCircle2, XCircle } from "lucide-react";
import { StatCard } from "@/components/plut/StatCard";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { dashboardStats, trades, brandById } from "@/data/mock";
import { formatNaira, relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/giftcards/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Plut Admin" }] }),
  component: Dashboard,
});

function Dashboard() {
  const queue = trades
    .filter((t) => t.status === "Submitted")
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">Today · {new Date().toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PriorityCard
          label="Pending Review"
          value={dashboardStats.pendingReview}
          unit="trades"
          tone={dashboardStats.pendingReview > 0 ? "danger" : "ok"}
          cta={{ to: "/admin/giftcards/trades", label: "Review Now" }}
          icon={Clock}
        />
        <PriorityCard
          label="Past SLA"
          value={dashboardStats.pastSla}
          unit="trades need attention"
          tone={dashboardStats.pastSla > 0 ? "danger" : "ok"}
          cta={{ to: "/admin/giftcards/trades", label: "View Now" }}
          icon={AlertTriangle}
          pulse
        />
        <StatCard label="Paid Today" value={formatNaira(dashboardStats.paidTodayNgn)} icon={CheckCircle2}
          sublabel={`across ${dashboardStats.paidTodayCount} trades`} />
        <StatCard label="Rejected Today" value={String(dashboardStats.rejectedToday)} icon={XCircle} sublabel="trades" />
        <StatCard label="Active Brands" value={String(dashboardStats.activeBrands)} icon={Gift} sublabel="live brands" />
        <StatCard label="Avg Review Time" value={`${dashboardStats.avgReviewMin} min`} icon={Activity} sublabel="last 24h" />
      </div>

      <section className="rounded-2xl border bg-card">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-base font-bold">Pending Review Queue</h2>
            <p className="text-xs text-muted-foreground">Oldest first · auto-refresh every 30s</p>
          </div>
          <Link to="/admin/giftcards/trades" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </header>
        {queue.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-success">All trades reviewed — queue is clear ✓</div>
        ) : (
          <>
          {/* Mobile cards */}
          <ul className="divide-y divide-border md:hidden">
            {queue.map((t) => {
              const brand = brandById(t.brandId);
              return (
                <li key={t.id}>
                  <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-secondary/40">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium"><span>{brand?.logoEmoji}</span>{brand?.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{truncId(t.id)} · {relativeTime(t.submittedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">{formatNaira(t.payoutNgn)}</p>
                      <div className="mt-0.5"><SlaIndicator deadlineIso={t.slaDeadlineAt} /></div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["ID", "Brand", "Payout", "Submitted", "SLA"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((t) => {
                  const brand = brandById(t.brandId);
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                      <td className="px-6 py-3.5 font-mono text-xs">
                        <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="hover:text-primary">{truncId(t.id)}</Link>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span className="text-base leading-none">{brand?.logoEmoji}</span>
                          {brand?.name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono font-semibold text-right">{formatNaira(t.payoutNgn)}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{relativeTime(t.submittedAt)}</td>
                      <td className="px-6 py-3.5"><SlaIndicator deadlineIso={t.slaDeadlineAt} /></td>
                    </tr>
                  );
                })}
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
        <div className={cn(
          "grid h-11 w-11 place-items-center rounded-xl",
          danger ? "bg-red-500/15 text-red-500" : "bg-primary/12 text-primary",
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <Link to={cta.to} className={cn(
        "mt-5 inline-flex items-center gap-1 text-xs font-semibold hover:underline",
        danger ? "text-red-500" : "text-primary",
      )}>
        {cta.label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}