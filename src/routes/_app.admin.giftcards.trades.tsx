import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trades, brandById, type TradeStatus } from "@/data/mock";
import { formatNaira, formatTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/trades")({
  head: () => ({ meta: [{ title: "Trades — Plut Admin" }] }),
  component: TradesLayout,
});

function TradesLayout() {
  // If a child route is matched (detail), render only that.
  const isDetail = useRouterState({ select: (s) => s.location.pathname.match(/^\/admin\/giftcards\/trades\/.+/) !== null });
  if (isDetail) return <Outlet />;

  const [status, setStatus] = useState<TradeStatus | "All">("Submitted");
  const [brand, setBrand] = useState<string>("All");
  const [query, setQuery] = useState("");

  const brandOptions = useMemo(() => Array.from(new Set(trades.map((t) => t.brandCode))), []);
  const list = trades
    .filter((t) => status === "All" || t.status === status)
    .filter((t) => brand === "All" || t.brandCode === brand)
    .filter((t) => !query || t.id.includes(query) || t.customerEmail.includes(query));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v as TradeStatus | "All")}>
          <SelectTrigger className="h-9 w-[160px]"><Filter className="h-3.5 w-3.5" /> <SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Submitted", "Approved", "Paid", "Rejected", "Cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All brands</SelectItem>
            {brandOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Trade ID or customer email" className="h-9 pl-9" />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{list.length} trade{list.length === 1 ? "" : "s"}</span>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Trade ID", "Customer", "Brand", "USD", "Payout NGN", "Submitted", "SLA", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const b = brandById(t.brandId);
                return (
                  <tr key={t.id} className="group border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                    <td className="px-6 py-3.5">
                      <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="font-mono text-xs hover:text-primary">
                        {truncId(t.id)}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{t.customerEmail}</td>
                    <td className="px-6 py-3.5"><span className="inline-flex items-center gap-2 font-medium">{b?.logoEmoji} {b?.name}</span></td>
                    <td className="px-6 py-3.5 font-mono">${t.totalUsd}</td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-right">{formatNaira(t.payoutNgn)}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{formatTime(t.submittedAt)}</td>
                    <td className="px-6 py-3.5">{t.status === "Submitted" ? <SlaIndicator deadlineIso={t.slaDeadlineAt} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={t.status} /></td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">No trades match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}