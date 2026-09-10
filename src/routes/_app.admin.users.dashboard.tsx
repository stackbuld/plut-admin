import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  Users,
  UserPlus,
  TrendingUp,
  ShieldCheck,
  CalendarIcon,
  X,
  Loader2,
  Activity,
  UserCheck,
} from "lucide-react";
import { StatCard } from "@/components/plut/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { userQueries } from "@/api";
import type { SignupStatsByStatus, SignupStatsByTier } from "@/api/types/users.types";

export const Route = createFileRoute("/_app/admin/users/dashboard")({
  head: () => ({ meta: [{ title: "User Growth — Plut Admin" }] }),
  component: UsersDashboard,
});

type RangePreset = "1m" | "3m" | "6m" | "custom";

const RANGE_OPTIONS: { value: RangePreset; label: string; months?: number }[] = [
  { value: "1m", label: "Last month", months: 1 },
  { value: "3m", label: "Last 3 months", months: 3 },
  { value: "6m", label: "Last 6 months", months: 6 },
  { value: "custom", label: "Custom range" },
];

function isoDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

const TODAY = new Date().toISOString().slice(0, 10);

// Status colors reuse the app's established semantic palette (see StatusBadge) rather than a
// fresh categorical set — these are reserved state colors, not arbitrary series identity.
const STATUS_META: { key: keyof SignupStatsByStatus; label: string; color: string }[] = [
  { key: "active", label: "Active", color: "#22c55e" },
  { key: "pending", label: "Pending", color: "#eab308" },
  { key: "suspended", label: "Suspended", color: "#ef4444" },
  { key: "deactivated", label: "Deactivated", color: "#9ca3af" },
];

// KYC tiers are ordinal (Tier0 → Tier3), so a single sequential hue ramp fits better than
// distinct categorical colors — deeper tier, deeper shade.
const TIER_META: { key: keyof SignupStatsByTier; label: string; color: string }[] = [
  { key: "tier0", label: "Tier 0", color: "#bfdbfe" },
  { key: "tier1", label: "Tier 1", color: "#60a5fa" },
  { key: "tier2", label: "Tier 2", color: "#3b82f6" },
  { key: "tier3", label: "Tier 3", color: "#1d4ed8" },
];

function UsersDashboard() {
  const [preset, setPreset] = useState<RangePreset>("3m");
  const [customFrom, setCustomFrom] = useState(isoDateMonthsAgo(3));
  const [customTo, setCustomTo] = useState(TODAY);
  const { theme } = useTheme();
  const dark = theme === "dark";

  const activePreset = RANGE_OPTIONS.find((o) => o.value === preset);
  const from = preset === "custom" ? customFrom : isoDateMonthsAgo(activePreset?.months ?? 3);
  const to = preset === "custom" ? customTo : TODAY;

  const { data, isLoading } = useQuery(userQueries.stats({ from, to }));

  const C = {
    hue: dark ? "#3b82f6" : "#2563eb",
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    axis: dark ? "#a1a1aa" : "#71717a",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Signup growth and account metrics.</p>
        <div className="flex items-center gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
                onChange={(e) => setCustomTo(e.target.value)}
                max={TODAY}
                min={customFrom || undefined}
                className="h-9 w-[140px] text-xs"
                title="To date"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Headline stats ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Users"
              value={data.totalUsers.toLocaleString()}
              icon={Users}
              sublabel="all time"
            />
            <StatCard
              label="New Signups"
              value={data.newUsersInRange.toLocaleString()}
              icon={UserPlus}
              sublabel={`in selected range`}
            />
            <StatCard
              label="Growth"
              value={`${data.growthPercent >= 0 ? "+" : ""}${data.growthPercent}%`}
              icon={TrendingUp}
              sublabel="vs. equivalent prior period"
            />
            <StatCard
              label="Active Users"
              value={data.statusBreakdown.active.toLocaleString()}
              icon={ShieldCheck}
              sublabel={`${data.statusBreakdown.suspended.toLocaleString()} suspended`}
            />
            <StatCard
              label={`Recently Active (${data.userActivity.activityWindowDays}d)`}
              value={data.userActivity.active.toLocaleString()}
              icon={Activity}
              sublabel={`${data.userActivity.dormant.toLocaleString()} dormant (no login in ${data.userActivity.activityWindowDays}d+)`}
            />
            <StatCard
              label="KYC Activation Rate"
              value={`${data.activation.activationRatePercent}%`}
              icon={UserCheck}
              sublabel={`${data.activation.activatedCount} of ${data.activation.signupsInRange} signups reached Tier1+`}
            />
          </div>

          {/* ── Signups by month ── */}
          <section className="rounded-2xl border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold">Signups by month</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              New user registrations, month by month
            </p>
            {data.monthlySignups.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.monthlySignups}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={fmtMonth}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: C.axis }}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tick={{ fontSize: 11, fill: C.axis }}
                  />
                  <Tooltip content={<SignupTooltip />} cursor={{ fill: C.grid }} />
                  <Bar dataKey="count" fill={C.hue} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* ── Suspensions & strikes by month ── */}
          <section className="rounded-2xl border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold">Suspensions &amp; strikes by month</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              New admin blocks and disciplinary strikes issued, month by month
            </p>
            {data.suspensionTrend.every((m) => m.blocks === 0 && m.strikes === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data.suspensionTrend}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={fmtMonth}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: C.axis }}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tick={{ fontSize: 11, fill: C.axis }}
                  />
                  <Tooltip content={<TrendTooltip />} cursor={{ stroke: C.grid }} />
                  <Legend
                    formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="blocks"
                    name="Blocks"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="strikes"
                    name="Strikes"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Status breakdown ── */}
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold">Users by status</h3>
              <p className="mb-4 text-xs text-muted-foreground">All users, current snapshot</p>
              <StatusSplit breakdown={data.statusBreakdown} />
            </section>

            {/* ── KYC tier breakdown ── */}
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold">Users by KYC tier</h3>
              <p className="mb-4 text-xs text-muted-foreground">All users, current snapshot</p>
              <TierSplit breakdown={data.kycTierBreakdown} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ── Status split (4 categories → legend + direct labels, 2px gaps) ─────────────
function StatusSplit({ breakdown }: { breakdown: SignupStatsByStatus }) {
  const total = STATUS_META.reduce((sum, m) => sum + breakdown[m.key], 0);
  if (total === 0) return <EmptyChart />;

  return (
    <div className="space-y-4">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary gap-0.5">
        {STATUS_META.map((m) => {
          const pct = (breakdown[m.key] / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={m.key}
              style={{ width: `${pct}%`, backgroundColor: m.color }}
              className="h-full rounded-sm"
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {STATUS_META.map((m) => (
          <LegendItem
            key={m.key}
            color={m.color}
            label={m.label}
            value={breakdown[m.key].toLocaleString()}
            pct={total > 0 ? (breakdown[m.key] / total) * 100 : 0}
          />
        ))}
      </div>
    </div>
  );
}

// ── Tier split (ordinal → horizontal bars, sequential ramp) ────────────────────
function TierSplit({ breakdown }: { breakdown: SignupStatsByTier }) {
  const total = TIER_META.reduce((sum, m) => sum + breakdown[m.key], 0);
  if (total === 0) return <EmptyChart />;
  const max = Math.max(...TIER_META.map((m) => breakdown[m.key]), 1);

  return (
    <div className="space-y-3">
      {TIER_META.map((m) => {
        const value = breakdown[m.key];
        const pct = (value / max) * 100;
        return (
          <div key={m.key} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">{m.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                style={{ width: `${pct}%`, backgroundColor: m.color }}
                className="h-full rounded-full"
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-xs font-semibold">
              {value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
  pct,
}: {
  color: string;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-semibold">
          {value}{" "}
          <span className="text-[11px] font-normal text-muted-foreground">· {pct.toFixed(0)}%</span>
        </p>
      </div>
    </div>
  );
}

function SignupTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value ?? 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{fmtMonth(String(label))}</p>
      <p className="font-mono font-semibold">
        {value.toLocaleString()} signup{value === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{fmtMonth(String(label))}</p>
      {payload.map((p) => (
        <p key={p.dataKey as string} className="font-mono" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value ?? 0}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      No signups recorded in this period yet.
    </div>
  );
}

function fmtMonth(month: string): string {
  // "2026-03" → "Mar 2026"
  const [y, m] = month.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return y && m ? `${months[Number(m) - 1]} ${y}` : month;
}
