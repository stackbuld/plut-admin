import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/plut/StatusBadge";
import {
  fxRateQueries,
  payoutCurrencyQueries, createPayoutCurrency, activatePayoutCurrency, deactivatePayoutCurrency,
  queryKeys,
} from "@/api";
import { toast } from "sonner";
import { Field, TabLoader, EmptyRow } from "@/components/plut/catalog-shared";

export const Route = createFileRoute("/_app/admin/giftcards/catalog/payout")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(payoutCurrencyQueries.list());
    qc.prefetchQuery(fxRateQueries.current());
  },
  component: PayoutCurrenciesTab,
});

function PayoutCurrenciesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [initRate, setInitRate] = useState("");

  const { data, isLoading } = useQuery(payoutCurrencyQueries.list());
  const { data: fxRates } = useQuery(fxRateQueries.current());

  const lookupFx = (q: string) =>
    fxRates?.find((f) => f.baseCurrency === "USD" && f.quoteCurrency === q)?.rate ?? 0;

  const createMutation = useMutation({
    mutationFn: () => createPayoutCurrency({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      symbol: symbol.trim(),
      initialUsdRate: parseFloat(initRate) || null,
    }),
    onSuccess: () => {
      const hasRate = !!parseFloat(initRate);
      toast.success(`${code} added as ${hasRate ? "Active" : "Draft"}.`);
      qc.invalidateQueries({ queryKey: queryKeys.payoutCurrencies.all() });
      setCode(""); setName(""); setSymbol(""); setInitRate(""); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      active ? deactivatePayoutCurrency(code) : activatePayoutCurrency(code),
    onSuccess: (_, { code, active }) => {
      toast.success(`${active ? "Deactivated" : "Activated"} ${code}.`);
      qc.invalidateQueries({ queryKey: queryKeys.payoutCurrencies.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Currencies customers can receive payouts in. <b>Active</b> currencies appear across the Set Rate modal, payout previews, and customer quotes.
          <b> Draft</b> currencies are registered but hidden until a USD/FX rate is set.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Currency</Button>
      </div>

      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Code", "Name", "Symbol", "USD/FX Rate", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((p) => {
                  const fx = lookupFx(p.code);
                  const hasRate = fx > 0 && p.code !== "USD";
                  return (
                    <tr key={p.code} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-6 py-3.5 font-mono text-xs font-semibold">{p.code}</td>
                      <td className="px-6 py-3.5">{p.name}</td>
                      <td className="px-6 py-3.5 font-mono">{p.symbol}</td>
                      <td className="px-6 py-3.5 font-mono text-xs">
                        {hasRate
                          ? `${p.symbol}${fx.toLocaleString()}`
                          : <span className="text-muted-foreground">No rate set</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={p.isActive ? "Active" : "Paused"} />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toggleMutation.mutate({ code: p.code, active: p.isActive })}>
                              {p.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {(data ?? []).length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border bg-amber-500/5 px-6 py-2 text-[11px] text-amber-700 dark:text-amber-400">
            ⚠ Draft currencies are hidden from the rest of the app until you set a USD/FX rate for them in the FX Rates tab.
          </p>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payout Currency</DialogTitle>
            <DialogDescription>Register a new local currency that customers can receive payouts in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ISO Code * (e.g. KES)">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={3} placeholder="KES" className="font-mono" />
              </Field>
              <Field label="Symbol *">
                <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="KSh" className="font-mono" />
              </Field>
            </div>
            <Field label="Name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kenyan Shilling" />
            </Field>
            <Field label="Initial USD / [currency] rate (optional)">
              <Input type="number" step="0.01" value={initRate} onChange={(e) => setInitRate(e.target.value)} placeholder="130.50" className="font-mono" />
              <p className="mt-1 text-xs text-muted-foreground">If set, the currency becomes Active immediately. Otherwise it starts as Draft.</p>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!code || !name || !symbol || createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add Currency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}