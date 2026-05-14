import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Clock, LayoutGrid, Globe } from "lucide-react";
import { StatCard } from "@/components/plut/StatCard";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { stats, trades, topBrandsByVolume } from "@/data/mock";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Overview — Plut Admin" }] }),
  component: Overview,
});

function Overview() {
  const recent = trades.slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Trades" value={stats.totalTrades.value.toLocaleString()} change={stats.totalTrades.change} icon={ArrowLeftRight} />
        <StatCard label="Pending Trades" value={stats.pendingTrades.value.toString()} change={stats.pendingTrades.change} icon={Clock} />
        <StatCard label="Active Brands" value={stats.activeBrands.value.toString()} icon={LayoutGrid} />
        <StatCard label="Countries" value={stats.countries.value.toString()} icon={Globe} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border bg-card lg:col-span-3">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-base font-bold">Recent Trades</h2>
            <a href="/trades" className="text-xs font-semibold text-primary hover:underline">View all</a>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Trade ID", "Brand", "Country", "Payout", "Status", "Date"].map(h => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.id} className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-mono text-xs">{t.id}</td>
                    <td className="px-6 py-3.5 font-medium">{t.brand}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{t.country}</td>
                    <td className="px-6 py-3.5 font-semibold">{formatNaira(t.payout)}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={t.status} /></td>
                    <td className="px-6 py-3.5 text-muted-foreground">{t.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border bg-card lg:col-span-2">
          <header className="border-b border-border px-6 py-4">
            <h2 className="font-display text-base font-bold">Top Brands by Volume</h2>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </header>
          <ol className="divide-y divide-border">
            {topBrandsByVolume.map((b, i) => (
              <li key={b.name} className="flex items-center gap-4 px-6 py-4">
                <span className="font-display text-2xl font-bold text-muted-foreground/60 w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.trades.toLocaleString()} trades</p>
                </div>
                <span className="font-display font-bold">{formatNaira(b.payout)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
