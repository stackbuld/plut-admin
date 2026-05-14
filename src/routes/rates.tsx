import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { rates } from "@/data/mock";
import { formatNaira, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rates")({
  head: () => ({ meta: [{ title: "Rates — Plut Admin" }] }),
  component: RatesPage,
});

function RatesPage() {
  const [syncing, setSyncing] = useState(false);
  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1500);
  };
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={handleSync} disabled={syncing} className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? "Syncing…" : "Sync Rates"}
        </button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Brand", "Country", "Card Type", "Denomination", "FX Rate", "NGN Payout", "Last Updated"].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rates.map(r => {
                const fresh = Date.now() - new Date(r.lastUpdated).getTime() < 10 * 60 * 1000;
                return (
                  <tr key={r.id} className={cn("border-b border-border last:border-0 hover:bg-secondary/40 relative", fresh && "shadow-[inset_3px_0_0_0_var(--color-primary)]")}>
                    <td className="px-5 py-3.5 font-medium">{r.brand}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{r.country}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.type} /></td>
                    <td className="px-5 py-3.5 font-mono">{r.amount.toFixed(2)} {r.currency}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">×{r.rate.toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-semibold">{formatNaira(r.payout)}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{relativeTime(r.lastUpdated)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
