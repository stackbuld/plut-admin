import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  ArrowRight, Coins, Download, Layers, Loader2, Percent, TrendingUp, Wallet,
} from "lucide-react";
import { subDays, startOfDay, endOfDay, format as formatDf } from "date-fns";
import { StatCard } from "@/components/plut/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cryptoRevenueQueries } from "@/api";
import { formatUsd } from "@/lib/format";

// Route/API background: docs/wallet-service-docs/crypto-wallet/admin-console/11-REVENUE_REPORTS.md.
// Backend is fully built (Web/Endpoints/AdminRevenue.cs, GetCryptoRevenueQuery) — this route is
// pure frontend against it. Unlike the crypto Dashboard's fixed-window revenue tile, this screen
// owns the date-range picker and trend chart — the Dashboard links here for exactly that.

export const Route = createFileRoute("/_app/admin/crypto/revenue")({
  head: () => ({ meta: [{ title: "Revenue — Plut Admin" }] }),
  component: RevenueReportPage,
});

type Preset = "7" | "30" | "90" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

function RevenueReportPage() {
  const [preset, setPreset] = useState<Preset>("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { theme } = useTheme();

  // Doc default is "last 7 days" — computed here (rather than left to the backend's own default)
  // so the picker, the query key, and the CSV export all agree on the exact window in view.
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (preset === "custom" && customFrom && customTo) {
      return {
        from: startOfDay(new Date(customFrom)).toISOString(),
        to: endOfDay(new Date(customTo)).toISOString(),
      };
    }
    const days = preset === "custom" ? 7 : Number(preset);
    return {
      from: startOfDay(subDays(now, days - 1)).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  }, [preset, customFrom, customTo]);

  const { data, isLoading, isFetching } = useQuery(cryptoRevenueQueries.report({ from, to }));

  const dark = theme === "dark";
  // Validated palette (see dataviz validator): a distinct categorical pair for the two additive
  // revenue mechanisms this screen exists to keep separate — spread (market-maker markup) vs
  // platform fee (explicit service charge).
  const C = {
    spread: dark ? "#3b82f6" : "#2563eb",
    fee: dark ? "#d97706" : "#f59e0b",
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    axis: dark ? "#a1a1aa" : "#71717a",
  };

  const totalSpread = data?.totalSpread ?? 0;
  const totalPlatformFee = data?.totalPlatformFee ?? 0;
  const total = totalSpread + totalPlatformFee;

  const byOperation = data?.byOperation ?? [];
  const byAsset = data?.byAsset ?? [];
  const dailySeries = data?.dailySeries ?? [];

  const exportCsv = () => {
    if (!data) return;
    // The doc's dedicated /Revenue/export?format=csv endpoint isn't built yet (only the aggregate
    // GET is) — generate the CSV client-side from the report already loaded rather than calling an
    // endpoint that doesn't exist. Three sections mirror the three breakdowns on screen.
    const rows: string[] = [];
    rows.push(`Revenue report,${data.from},${data.to}`);
    rows.push("");
    rows.push("Section,Spread (USD),Platform Fee (USD)");
    rows.push(`Total,${totalSpread},${totalPlatformFee}`);
    rows.push("");
    rows.push("By Operation");
    rows.push("Operation Type,Spread (USD),Platform Fee (USD)");
    byOperation.forEach((o) => rows.push(`${o.operationType},${o.spread},${o.platformFee}`));
    rows.push("");
    rows.push("By Asset");
    rows.push("Asset,Total (USD)");
    byAsset.forEach((a) => rows.push(`${a.asset},${a.total}`));
    rows.push("");
    rows.push("Daily Series");
    rows.push("Date,Spread (USD),Platform Fee (USD)");
    dailySeries.forEach((d) => rows.push(`${d.date},${d.spread},${d.platformFee}`));

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crypto-revenue_${data.from.slice(0, 10)}_${data.to.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-bold">Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Spread and platform-fee revenue from Buy/Sell/Swap/Withdrawal settlement.{" "}
            <Link to="/admin/crypto/pricing/fees" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Adjust fee & spread rules <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESETS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 w-[140px] text-xs"
                title="From date"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 w-[140px] text-xs"
                title="To date"
              />
            </>
          )}

          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data || isLoading}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-muted-foreground">Refreshing…</p>
          )}

          {/* ── Headline ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Spread Revenue" value={formatUsd(totalSpread)} icon={TrendingUp} sublabel="Market-maker markup" />
            <StatCard label="Platform Fee Revenue" value={formatUsd(totalPlatformFee)} icon={Percent} sublabel="Explicit service charge" />
            <StatCard label="Total" value={formatUsd(total)} icon={Wallet} sublabel="Spread + platform fee" />
          </div>

          {/* ── By operation ── */}
          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">By operation</h3>
            </div>
            {byOperation.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operation</th>
                      <th className="py-2 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Spread</th>
                      <th className="py-2 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Platform Fee</th>
                      <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byOperation.map((o) => (
                      <tr key={o.operationType} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{o.operationType}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{formatUsd(o.spread)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{formatUsd(o.platformFee)}</td>
                        <td className="py-2.5 text-right font-mono font-semibold">{formatUsd(o.spread + o.platformFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── By asset ── */}
            <section className="rounded-2xl border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">By asset</h3>
              </div>
              {byAsset.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, byAsset.length * 40)}>
                  <BarChart data={byAsset} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke={C.grid} />
                    <XAxis type="number" tickFormatter={(v) => formatUsd(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} />
                    <YAxis type="category" dataKey="asset" width={64} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} />
                    <Tooltip content={<AssetTooltip />} cursor={{ fill: C.grid }} />
                    <Bar dataKey="total" fill={C.spread} radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            {/* ── Daily trend ── */}
            <section className="rounded-2xl border bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Daily trend</h3>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">Spread vs. platform fee, stacked</p>
              {dailySeries.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailySeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="date" tickFormatter={fmtDay} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} minTickGap={24} />
                    <YAxis tickFormatter={(v) => formatUsd(Number(v))} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: C.axis }} />
                    <Tooltip content={<TrendTooltip />} cursor={{ fill: C.grid }} />
                    <Legend
                      formatter={(value) => (value === "spread" ? "Spread" : "Platform Fee")}
                      wrapperStyle={{ fontSize: 11, color: C.axis }}
                    />
                    <Bar dataKey="spread" stackId="rev" fill={C.spread} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="platformFee" stackId="rev" fill={C.fee} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function AssetTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{row.asset}</p>
      <p className="font-mono font-semibold">{formatUsd(row.total)}</p>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{fmtDay(label)}</p>
      <p className="font-mono">Spread: <span className="font-semibold">{formatUsd(row.spread)}</span></p>
      <p className="font-mono">Platform Fee: <span className="font-semibold">{formatUsd(row.platformFee)}</span></p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
      No revenue recorded in this period yet.
    </div>
  );
}

function fmtDay(day: string): string {
  // "2026-08-21" -> "21 Aug"
  try {
    return formatDf(new Date(`${day}T00:00:00`), "d MMM");
  } catch {
    return day;
  }
}
