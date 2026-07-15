import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle, Loader2, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/plut/catalog-shared";
import {
  fxRateQueries, applyStagedFxRate, overrideStagedFxRate, discardStagedFxRate, queryKeys,
  type StagedFxRateItem,
} from "@/api";
import { toast } from "sonner";
import { currencySymbol } from "@/lib/format";

/**
 * Review panel for FX rates fetched from the provider feed but not yet applied. The nightly feed never
 * changes the live rate; the admin applies each staged rate as-is, overrides it with a manual value, or
 * discards it. Applying/overriding changes every brand payout that converts through the pair — hence the
 * confirmation warnings.
 */
export function StagedFxRates() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(fxRateQueries.staged());
  const staged = data ?? [];

  const [applyFor, setApplyFor] = useState<StagedFxRateItem | null>(null);
  const [discardFor, setDiscardFor] = useState<StagedFxRateItem | null>(null);
  const [overrideFor, setOverrideFor] = useState<StagedFxRateItem | null>(null);
  const [overrideRate, setOverrideRate] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.fxRates.all() });
    qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
  };

  const applyMutation = useMutation({
    mutationFn: (id: string) => applyStagedFxRate(id),
    onSuccess: () => { toast.success("Staged rate applied to the live ledger."); invalidate(); setApplyFor(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) => overrideStagedFxRate(id, rate),
    onSuccess: () => { toast.success("Manual rate applied to the live ledger."); invalidate(); setOverrideFor(null); setOverrideRate(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const discardMutation = useMutation({
    mutationFn: (id: string) => discardStagedFxRate(id),
    onSuccess: () => { toast.success("Staged rate discarded."); invalidate(); setDiscardFor(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isLoading && staged.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-amber-500/20 px-6 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-semibold">New FX rates available</p>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          {staged.length} pending
        </span>
        <p className="ml-auto text-xs text-muted-foreground">Fetched from the feed — not applied until you review.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                {["Pair", "Type", "Old rate", "", "New rate", "Change", ""].map((h, i) => (
                  <th key={i} className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staged.map((s) => {
                const sym = currencySymbol(s.quoteCurrency);
                const up = (s.delta ?? 0) > 0;
                const down = (s.delta ?? 0) < 0;
                return (
                  <tr key={s.id} className="border-b border-amber-500/10 last:border-0">
                    <td className="px-6 py-3 font-mono font-semibold text-xs">{s.baseCurrency}/{s.quoteCurrency}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.rateType === "Payout" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                        {s.rateType}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-muted-foreground">
                      {s.currentRate != null ? `${sym}${s.currentRate.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" /></td>
                    <td className="px-6 py-3 font-mono font-semibold">{sym}{s.stagedRate.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      {s.deltaPercent != null ? (
                        <span className={`inline-flex items-center gap-1 font-mono text-xs ${up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-destructive" : "text-muted-foreground"}`}>
                          {up ? <TrendingUp className="h-3 w-3" /> : down ? <TrendingDown className="h-3 w-3" /> : null}
                          {up ? "+" : ""}{s.deltaPercent.toFixed(2)}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">new pair</span>}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setApplyFor(s)}>
                          <Check className="h-3.5 w-3.5" /> Apply
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                          onClick={() => { setOverrideFor(s); setOverrideRate(String(s.stagedRate)); }}>
                          <Pencil className="h-3.5 w-3.5" /> Override
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDiscardFor(s)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Apply confirmation */}
      <AlertDialog open={!!applyFor} onOpenChange={(o) => { if (!o) setApplyFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this FX rate?</AlertDialogTitle>
            <AlertDialogDescription>
              {applyFor && (
                <>Setting <span className="font-semibold">{applyFor.baseCurrency}/{applyFor.quoteCurrency}</span> to{" "}
                  <span className="font-mono font-semibold">{currencySymbol(applyFor.quoteCurrency)}{applyFor.stagedRate.toLocaleString()}</span>{" "}
                  will immediately affect <span className="font-semibold">every brand payout</span> that converts through this currency pair. The previous rate is archived.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyFor && applyMutation.mutate(applyFor.id)} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? "Applying…" : "Apply rate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirmation */}
      <AlertDialog open={!!discardFor} onOpenChange={(o) => { if (!o) setDiscardFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this staged rate?</AlertDialogTitle>
            <AlertDialogDescription>
              The fetched rate will be dismissed without touching the live ledger. The next feed refresh may stage it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => discardFor && discardMutation.mutate(discardFor.id)} disabled={discardMutation.isPending}>
              {discardMutation.isPending ? "Discarding…" : "Discard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Override with a manual value */}
      <Dialog open={!!overrideFor} onOpenChange={(o) => { if (!o) { setOverrideFor(null); setOverrideRate(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override FX rate</DialogTitle>
            <DialogDescription>
              {overrideFor && (
                <>Apply a manual rate for <span className="font-semibold">{overrideFor.baseCurrency}/{overrideFor.quoteCurrency}</span> instead of the fetched{" "}
                  <span className="font-mono">{currencySymbol(overrideFor.quoteCurrency)}{overrideFor.stagedRate.toLocaleString()}</span>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label={overrideFor ? `Rate (${overrideFor.quoteCurrency} per 1 ${overrideFor.baseCurrency}) *` : "Rate *"}>
              <Input type="number" step="0.000001" value={overrideRate} onChange={(e) => setOverrideRate(e.target.value)}
                className="font-mono" placeholder="1550.00" />
            </Field>
            <p className="flex items-start gap-2 rounded-lg border bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This will immediately affect all brand payouts that convert through this pair. The previous rate is archived.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOverrideFor(null); setOverrideRate(""); }}>Cancel</Button>
            <Button
              disabled={!overrideRate || !(parseFloat(overrideRate) > 0) || overrideMutation.isPending}
              onClick={() => overrideFor && overrideMutation.mutate({ id: overrideFor.id, rate: parseFloat(overrideRate) })}>
              {overrideMutation.isPending ? "Applying…" : "Apply manual rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
