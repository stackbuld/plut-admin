import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SlaIndicator } from "@/components/plut/SlaIndicator";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tradeQueries, type TradeStatus } from "@/api";
import { formatDate, formatTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/trades")({
  head: () => ({ meta: [{ title: "Trades — Plut Admin" }] }),
  component: TradesLayout,
});

function TradesLayout() {
  const isDetail = useRouterState({ select: (s) => s.location.pathname.match(/^\/admin\/giftcards\/trades\/.+/) !== null });
  if (isDetail) return <Outlet />;

  const [status, setStatus] = useState<TradeStatus | "All">("Submitted");
  const [query, setQuery] = useState("");

  const params = status !== "All" ? { Status: status, PageSize: 100 } : { PageSize: 100 };
  const { data, isLoading } = useQuery(tradeQueries.list(params));

  const list = useMemo(() => {
    const items = data?.items ?? [];
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((t) => t.id.toLowerCase().includes(q) || t.customerId.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v as TradeStatus | "All")}>
          <SelectTrigger className="h-9 w-[160px]"><Filter className="h-3.5 w-3.5" /> <SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Submitted", "Approved", "Accepted", "Paid", "Rejected", "Cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Trade ID or customer ID" className="h-9 pl-9" />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${list.length} trade${list.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {list.map((t) => (
              <Link key={t.id} to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }}
                className="block rounded-2xl border bg-card p-4 transition-colors active:bg-secondary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-medium">{truncId(t.id)}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{truncId(t.customerId)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xs text-muted-foreground">{t.itemCount} item{t.itemCount !== 1 ? "s" : ""}</p>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">{t.totalCustomerPayoutAmount.toLocaleString()} {t.payoutCurrency}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">${t.totalCardValueUsd.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  <div>
                    <p className="text-xs font-medium tabular-nums">{formatTime(t.submittedAt)}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(t.submittedAt)}</p>
                  </div>
                  {t.status === "Submitted" ? <SlaIndicator deadlineIso={t.slaDeadlineAt} /> : <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">No trades match these filters.</div>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    {["Trade ID", "Customer", "Items", "USD Value", "Payout", "Submitted", "SLA", "Status"].map((h) => (
                      <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id} className="group border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                      <td className="px-6 py-3.5">
                        <Link to="/admin/giftcards/trades/$tradeId" params={{ tradeId: t.id }} className="font-mono text-xs hover:text-primary">{truncId(t.id)}</Link>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                        <UserRef userId={t.customerId}>{truncId(t.customerId)}</UserRef>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">{t.itemCount}</td>
                      <td className="px-6 py-3.5 font-mono">${t.totalCardValueUsd.toFixed(2)}</td>
                      <td className="px-6 py-3.5 font-mono font-semibold text-right">{t.totalCustomerPayoutAmount.toLocaleString()} {t.payoutCurrency}</td>
                      <td className="px-6 py-3.5">
                        <p className="text-sm tabular-nums">{formatTime(t.submittedAt)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(t.submittedAt)}</p>
                      </td>
                      <td className="px-6 py-3.5">{t.status === "Submitted" ? <SlaIndicator deadlineIso={t.slaDeadlineAt} /> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">No trades match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
