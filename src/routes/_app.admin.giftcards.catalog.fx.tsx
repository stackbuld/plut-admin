import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fxRateQueries, setFxRate, payoutCurrencyQueries, queryKeys } from "@/api";
import { toast } from "sonner";
import { formatDateTime, currencySymbol } from "@/lib/format";
import { Field, TabLoader, EmptyRow } from "@/components/plut/catalog-shared";

export const Route = createFileRoute("/_app/admin/giftcards/catalog/fx")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(fxRateQueries.current());
    qc.prefetchQuery(payoutCurrencyQueries.list());
  },
  component: FxTab,
});

function FxTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("NGN");
  const [rate, setRate] = useState("");
  const [src, setSrc] = useState<"Manual" | "Auto">("Manual");
  const [historyCurrency, setHistoryCurrency] = useState<string | null>(null);

  const { data, isLoading } = useQuery(fxRateQueries.current());
  const { data: payouts } = useQuery(payoutCurrencyQueries.list());
  const { data: historyData, isLoading: historyLoading } = useQuery({
    ...fxRateQueries.history(historyCurrency ?? "NGN"),
    enabled: historyCurrency !== null,
  });

  const activePayout = (payouts ?? []).filter((p) => p.isActive);
  const fxType = (b: string) => b === "USD" ? "Payout" : "Acquisition";

  const mutation = useMutation({
    mutationFn: () => setFxRate({ baseCurrency: base, quoteCurrency: quote, rate: parseFloat(rate), source: src === "Manual" ? "Admin" : "System" }),
    onSuccess: () => {
      toast.success(`FX rate set: ${base}/${quote} ${rate}`);
      qc.invalidateQueries({ queryKey: queryKeys.fxRates.all() });
      setRate(""); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Two types live here: <b>Payout rates</b> (USD → local currency) and <b>Acquisition rates</b> (CNY → NGN).
          Old rates are archived as immutable history.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Set FX Rate</Button>
      </div>

      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Pair", "Rate", "Type", "Source", "Valid From", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((fx, i) => {
                  const type = fxType(fx.baseCurrency);
                  return (
                    <tr key={i} className="border-b border-border last:border-0 bg-primary/5 hover:bg-primary/10">
                      <td className="px-6 py-3.5 font-mono font-semibold text-xs">{fx.baseCurrency}/{fx.quoteCurrency}</td>
                      <td className="px-6 py-3.5 font-mono">{currencySymbol(fx.quoteCurrency)}{fx.rate.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${type === "Payout" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                          {type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">{fx.source ?? "—"}</td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">{formatDateTime(fx.validFrom)}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Active</span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                          onClick={() => setHistoryCurrency(historyCurrency === fx.quoteCurrency ? null : fx.quoteCurrency)}>
                          <History className="h-3.5 w-3.5" />
                          {historyCurrency === fx.quoteCurrency ? "Hide" : "History"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(data ?? []).length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historyCurrency && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <p className="text-sm font-semibold">USD/{historyCurrency} history</p>
            {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Pair", "Rate", "Source", "Status", "Valid From", "Valid To"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(historyData ?? []).map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3 font-mono font-semibold text-xs">{h.baseCurrency}/{h.quoteCurrency}</td>
                    <td className="px-6 py-3 font-mono">{h.rate.toLocaleString()}</td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">{h.source ?? "—"}</td>
                    <td className="px-6 py-3">
                      {h.isCurrent
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Current</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Expired</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">{formatDateTime(h.validFrom)}</td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">{h.validTo ? formatDateTime(h.validTo) : "—"}</td>
                  </tr>
                ))}
                {!historyLoading && (historyData ?? []).length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set FX Rate</DialogTitle>
            <DialogDescription>Sets the active conversion rate. The previous rate is archived.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Base Currency *">
                <Select value={base} onValueChange={setBase}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — payout rate</SelectItem>
                    <SelectItem value="CNY">CNY — acquisition rate</SelectItem>
                    {activePayout.filter((p) => p.code !== "NGN" && p.code !== "USD").map((p) => (
                      <SelectItem key={p.code} value={p.code}>{p.code} — payout rate</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quote Currency *">
                <Select value={quote} onValueChange={setQuote}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activePayout.map((p) => (
                      <SelectItem key={p.code} value={p.code}>{p.code} — {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={`Rate (${quote} per 1 ${base}) *`}>
              <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1550.00" className="font-mono" />
            </Field>
            <Field label="Source">
              <Select value={src} onValueChange={(v) => setSrc(v as "Manual" | "Auto")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <p className="flex items-start gap-2 rounded-lg border bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Setting a new rate immediately affects all payout previews. The previous rate is archived.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!rate || isNaN(parseFloat(rate)) || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Set FX Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}