import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, RotateCw, BellOff, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuration, formatDateTime } from "@/lib/format";
import {
  awaitingProviderQueries,
  retryTradeDiscovery,
  ignoreTradeDiscovery,
  queryKeys,
  type AwaitingProviderItem,
} from "@/api";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";

const HEADERS = ["Trade", "Card spec", "Asked", "Waiting", ""];

export function AwaitingProvidersList() {
  const { data, isLoading } = useQuery(awaitingProviderQueries.list());
  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          These trades were broadcast to providers once, but the discovery window closed with{" "}
          <span className="font-medium text-foreground">no reply</span>. They won't re-broadcast
          automatically — <span className="font-medium text-foreground">Re-trigger</span> to ask again,
          or <span className="font-medium text-foreground">Ignore</span> to dismiss.
        </p>
      </div>

      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <AwaitingRow key={item.rateRequestId} item={item} />
                ))}
                {items.length === 0 && <EmptyRow cols={HEADERS.length} />}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AwaitingRow({ item }: { item: AwaitingProviderItem }) {
  const qc = useQueryClient();
  const [action, setAction] = useState<"retry" | "ignore" | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.sourcing.awaiting() });

  const retry = useMutation({
    mutationFn: () => { setAction("retry"); return retryTradeDiscovery(item.tradeId); },
    onSuccess: () => { toast.success("Re-broadcast sent — asking providers again."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setAction(null),
  });

  const ignore = useMutation({
    mutationFn: () => { setAction("ignore"); return ignoreTradeDiscovery(item.tradeId); },
    onSuccess: () => { toast.success("Dismissed from the awaiting list."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setAction(null),
  });

  const busy = retry.isPending || ignore.isPending;
  // Escalate the colour as the wait grows: amber under 5 min, red beyond.
  const stale = item.waitedSeconds >= 300;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/40">
      <td className="px-6 py-3.5">
        <span className="font-mono text-xs">{item.tradeId.slice(0, 8)}</span>
      </td>
      <td className="px-6 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {item.brandCode} · {item.countryCode || "—"}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {item.denominationAmount} {item.denominationCurrency} · {item.cardFormat}
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5 text-muted-foreground">
        {item.broadcastProviderCount} provider{item.broadcastProviderCount === 1 ? "" : "s"}
      </td>
      <td className="px-6 py-3.5 whitespace-nowrap" title={`Expired ${formatDateTime(item.expiredAt)}`}>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium " +
            (stale
              ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300")
          }
        >
          <Timer className="h-3 w-3" />
          {formatDuration(item.waitedSeconds)}
        </span>
      </td>
      <td className="px-6 py-3.5 text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => retry.mutate()}>
            {action === "retry" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            Re-trigger
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground"
            disabled={busy}
            onClick={() => ignore.mutate()}
          >
            {action === "ignore" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
            Ignore
          </Button>
        </div>
      </td>
    </tr>
  );
}
