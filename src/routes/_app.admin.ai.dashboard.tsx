import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList,
} from "recharts";
import { Coins, MessagesSquare, Users, Bot, Loader2, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/plut/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { aiQueries } from "@/api";
import { formatUsd, formatTokens } from "@/lib/format";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/ai/dashboard")({
  head: () => ({ meta: [{ title: "AI Overview — Plut Admin" }] }),
  component: AiDashboard,
});

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function AiDashboard() {
  const [days, setDays] = useState("30");
  const { data, isLoading } = useQuery(aiQueries.stats(Number(days)));
  const { theme } = useTheme();

  // Validated palette (see dataviz validator): single hue for magnitude series; a distinct
  // categorical pair for the chat-vs-image split, tuned per surface.
  const dark = theme === "dark";
  const C = {
    hue: dark ? "#3b82f6" : "#2563eb",
    chat: dark ? "#3b82f6" : "#2563eb",
    image: dark ? "#d97706" : "#f59e0b",
    grid: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    axis: dark ? "#a1a1aa" : "#71717a",
  };

  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Conversation activity and LLM/vision spend.</p>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Headline stats ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total AI Cost" value={formatUsd(t!.totalCostUsd)} icon={Coins} sublabel={`${formatTokens(t!.totalTokens)} tokens`} />
            <StatCard label="Conversations" value={t!.conversations.toLocaleString()} icon={Bot} sublabel={`${t!.activeUsers} active users`} />
            <StatCard label="Messages" value={t!.messages.toLocaleString()} icon={MessagesSquare} sublabel={`over ${data.days} days`} />
            <StatCard label="Active Users" value={t!.activeUsers.toLocaleString()} icon={Users} sublabel="with a conversation" />
          </div>

          {t!.unresolvedCostCalls > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t!.unresolvedCostCalls} model call{t!.unresolvedCostCalls === 1 ? "" : "s"} recorded tokens but no cost
                (the provider didn't report one). Token totals are complete; cost is a lower bound.
              </p>
            </div>
          )}

          {/* ── Cost over time ── */}
          <section className="rounded-2xl border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold">Cost over time</h3>
            <p className="mb-4 text-xs text-muted-foreground">Daily AI spend (USD)</p>
            {data.byDay.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.byDay} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.hue} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={C.hue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} minTickGap={24} />
                  <YAxis tickFormatter={(v) => formatUsd(Number(v))} tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11, fill: C.axis }} />
                  <Tooltip content={<CostTooltip />} cursor={{ stroke: C.axis, strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey="costUsd" stroke={C.hue} strokeWidth={2} fill="url(#costFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Cost by model ── */}
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold">Cost by model</h3>
              <p className="mb-4 text-xs text-muted-foreground">USD, this period</p>
              {data.byModel.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, data.byModel.length * 44)}>
                  <BarChart data={data.byModel} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke={C.grid} />
                    <XAxis type="number" tickFormatter={(v) => formatUsd(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} />
                    <YAxis type="category" dataKey="model" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.axis }} tickFormatter={shortModel} />
                    <Tooltip content={<CostTooltip labelKey="model" />} cursor={{ fill: C.grid }} />
                    <Bar dataKey="costUsd" fill={C.hue} radius={[0, 4, 4, 0]} barSize={18}>
                      <LabelList dataKey="costUsd" position="right" formatter={(v: number) => formatUsd(v)} style={{ fontSize: 11, fill: C.axis }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            {/* ── Chat vs image analysis split ── */}
            <section className="rounded-2xl border bg-card p-5">
              <h3 className="mb-1 text-sm font-semibold">Spend by capability</h3>
              <p className="mb-4 text-xs text-muted-foreground">Chat completions vs giftcard image analysis</p>
              <CapabilitySplit chatUsd={t!.chatCostUsd} imageUsd={t!.imageAnalysisCostUsd} chatColor={C.chat} imageColor={C.image} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ── Capability split (2 categories → legend + direct labels, 2px gap) ──────────
function CapabilitySplit({ chatUsd, imageUsd, chatColor, imageColor }: {
  chatUsd: number; imageUsd: number; chatColor: string; imageColor: string;
}) {
  const total = chatUsd + imageUsd;
  const chatPct = total > 0 ? (chatUsd / total) * 100 : 0;
  const imagePct = total > 0 ? (imageUsd / total) * 100 : 0;

  if (total === 0) return <EmptyChart />;

  return (
    <div className="space-y-4">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
        <div style={{ width: `${chatPct}%`, backgroundColor: chatColor }} className="h-full" />
        <div style={{ width: `${imagePct}%`, backgroundColor: imageColor }} className="h-full border-l-2 border-card" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <LegendItem color={chatColor} label="Chat" value={formatUsd(chatUsd)} pct={chatPct} />
        <LegendItem color={imageColor} label="Image analysis" value={formatUsd(imageUsd)} pct={imagePct} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono text-sm font-semibold">{value} <span className="text-[11px] font-normal text-muted-foreground">· {pct.toFixed(0)}%</span></p>
      </div>
    </div>
  );
}

function CostTooltip({ active, payload, label, labelKey }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const title = labelKey ? row[labelKey] : fmtDay(label);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{title}</p>
      <p className="font-mono font-semibold">{formatUsd(row.costUsd)}</p>
      <p className="text-muted-foreground">{formatTokens(row.tokens)} tokens · {row.calls} call{row.calls === 1 ? "" : "s"}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      No cost recorded in this period yet.
    </div>
  );
}

function fmtDay(day: string): string {
  // "2026-07-11" → "11 Jul"
  const [, m, d] = day.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return m && d ? `${Number(d)} ${months[Number(m) - 1]}` : day;
}

function shortModel(model: string): string {
  // "google/gemini-2.5-flash" → "gemini-2.5-flash"
  const slash = model.lastIndexOf("/");
  const short = slash >= 0 ? model.slice(slash + 1) : model;
  return short.length > 22 ? short.slice(0, 22) + "…" : short;
}
