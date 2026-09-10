import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay, format as formatDf } from "date-fns";
import { Loader2, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { ledgerQueries } from "@/api/ledger";
import { revenueQueries } from "@/api/ledger-revenue";
import { REVENUE_GROUP_BY, type RevenueGroupBy } from "@/api/types/ledger-revenue.types";

// docs/ledger-service-docs/admin-console/07-REVENUE_AND_PNL.md — wiring onto an already-built
// aggregation (IPostingIndexStore.AggregatePnLAsync / AggregateRevenueTimeSeriesAsync), no new SQL.
export const Route = createFileRoute("/_app/admin/ledger/revenue")({
  component: RevenuePage,
});

function RevenuePage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>("Product");
  const [fromDate, setFromDate] = useState(formatDf(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(formatDf(new Date(), "yyyy-MM-dd"));
  const { theme } = useTheme();

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const from = startOfDay(new Date(fromDate)).toISOString();
  const to = endOfDay(new Date(toDate)).toISOString();

  const { data: statement, isLoading: statementLoading } = useQuery(
    revenueQueries.incomeStatement({ ledger, from, to, groupBy }),
  );
  const { data: series, isLoading: seriesLoading } = useQuery(
    revenueQueries.breakdown({ ledger, from, to, groupBy, granularity: "day" }),
  );

  const groupKeyName = groupBy.toLowerCase();

  const totals = useMemo(() => {
    const rows = statement ?? [];
    const revenue = rows.reduce((sum, r) => sum + r.revenueTotalMinor, 0);
    const expenses = rows.reduce(
      (sum, r) => sum + r.cogsTotalMinor + r.providerFeesTotalMinor + r.opexTotalMinor + r.otherExpenseTotalMinor,
      0,
    );
    const byGroup = new Map<string, number>();
    for (const r of rows) {
      const key = r.groupKey[groupKeyName] ?? "Unspecified";
      byGroup.set(key, (byGroup.get(key) ?? 0) + r.revenueTotalMinor);
    }
    return {
      revenue,
      expenses,
      net: revenue - expenses,
      byGroup: Array.from(byGroup.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [statement, groupKeyName]);

  type ChartRow = { bucket: string; [group: string]: number | string };

  const chartData = useMemo(() => {
    const rows = series ?? [];
    const byBucket = new Map<string, ChartRow>();
    const groups = new Set<string>();
    for (const r of rows) {
      const bucket = r.bucketStart.slice(0, 10);
      const key = r.groupKey[groupKeyName] ?? "Unspecified";
      groups.add(key);
      const total = r.revenueFees + r.revenueSpread + r.revenueCommission + r.revenueOther;
      const existing = byBucket.get(bucket) ?? { bucket };
      existing[key] = (Number(existing[key]) || 0) + total;
      byBucket.set(bucket, existing);
    }
    return {
      data: Array.from(byBucket.values()).sort((a, b) => a.bucket.localeCompare(b.bucket)),
      groups: Array.from(groups),
    };
  }, [series, groupKeyName]);

  const dark = theme === "dark";
  const palette = dark
    ? ["#3b82f6", "#d97706", "#22c55e", "#a855f7", "#ec4899", "#06b6d4"]
    : ["#2563eb", "#f59e0b", "#16a34a", "#9333ea", "#db2777", "#0891b2"];
  const grid = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const axis = dark ? "#a1a1aa" : "#71717a";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Revenue &amp; P&amp;L</h1>
          <p className="text-xs text-muted-foreground">
            What the platform is actually earning — by product, provider, or channel.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ledger">
            <select
              value={ledger}
              onChange={(e) => setLedger(e.target.value)}
              className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
            >
              {(ledgers ?? []).map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[150px] text-xs" />
          </Field>
          <Field label="To">
            <Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[150px] text-xs" />
          </Field>
          <Field label="Group by">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as RevenueGroupBy)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {REVENUE_GROUP_BY.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Income Statement</h3>
        {statementLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <Row label="Revenue" value={totals.revenue} bold />
            {totals.byGroup.map(([key, value]) => (
              <Row key={key} label={key} value={value} indent />
            ))}
            <Row label="Expenses" value={totals.expenses} bold />
            <div className="mt-2 border-t border-border pt-2">
              <Row label="Net" value={totals.net} bold />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Daily revenue, by {groupBy.toLowerCase()}</h3>
        </div>
        {seriesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.data.length === 0 ? (
          <p className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No revenue recorded in this period yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="bucket" tickFormatter={fmtDay} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} minTickGap={24} />
              <YAxis tickFormatter={(v) => Number(v).toLocaleString()} tickLine={false} axisLine={false} width={72} tick={{ fontSize: 11, fill: axis }} />
              <Tooltip labelFormatter={fmtDay} formatter={(v: number) => v.toLocaleString()} />
              <Legend wrapperStyle={{ fontSize: 11, color: axis }} />
              {chartData.groups.map((g, i) => (
                <Bar key={g} dataKey={g} stackId="rev" fill={palette[i % palette.length]} radius={i === chartData.groups.length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold, indent }: { label: string; value: number; bold?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${indent ? "pl-4 text-muted-foreground" : ""} ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value.toLocaleString()}</span>
    </div>
  );
}

function fmtDay(day: string): string {
  try {
    return formatDf(new Date(`${day}T00:00:00`), "d MMM");
  } catch {
    return day;
  }
}
