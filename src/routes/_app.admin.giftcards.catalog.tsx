import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SetRateDialog, type DenomRateContext } from "@/components/plut/SetRateDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, AlertTriangle, Loader2, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/plut/StatusBadge";
import {
  countryQueries, createCountry,
  brandQueries,
  denominationQueries, activateDenomination, deactivateDenomination,
  rateQueries, deactivateRate,
  fxRateQueries, setFxRate,
  payoutCurrencyQueries, createPayoutCurrency, activatePayoutCurrency, deactivatePayoutCurrency,
  queryKeys,
} from "@/api";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Plut Admin" }] }),
  component: Catalog,
});

function Catalog() {
  return (
    <Tabs defaultValue="countries" className="space-y-5">
      <TabsList className="w-full max-w-full overflow-x-auto whitespace-nowrap">
        <TabsTrigger value="countries">Countries</TabsTrigger>
        <TabsTrigger value="denominations">Denominations</TabsTrigger>
        <TabsTrigger value="rates">Rates</TabsTrigger>
        <TabsTrigger value="fx">FX Rates</TabsTrigger>
        <TabsTrigger value="payout">Payout Currencies</TabsTrigger>
      </TabsList>
      <TabsContent value="countries"><CountriesTab /></TabsContent>
      <TabsContent value="denominations"><DenominationsTab /></TabsContent>
      <TabsContent value="rates"><RatesTab /></TabsContent>
      <TabsContent value="fx"><FxTab /></TabsContent>
      <TabsContent value="payout"><PayoutCurrenciesTab /></TabsContent>
    </Tabs>
  );
}

// ── Countries ────────────────────────────────────────────────────────────────

function CountriesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery(countryQueries.list());

  const mutation = useMutation({
    mutationFn: () => createCountry({ countryCode: code.trim().toUpperCase(), countryName: name.trim() }),
    onSuccess: () => {
      toast.success("Country added.");
      qc.invalidateQueries({ queryKey: queryKeys.countries.all() });
      setCode(""); setName(""); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Country</Button>
      </div>
      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Country", "Code", "Currency", "Brands", "Status"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-medium">{c.name}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{c.code}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{c.currencyCode}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{c.linkedBrands.length}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={c.isActive ? "Active" : "Paused"} /></td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <EmptyRow cols={5} />}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Country</DialogTitle><DialogDescription>Add a country to the giftcard catalog.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Country code (ISO) *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. US" className="font-mono" maxLength={3} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Country name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. United States" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!code.trim() || !name.trim() || mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add Country"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Denominations ─────────────────────────────────────────────────────────────

function DenominationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(denominationQueries.list({ PageSize: 100 }));
  const { data: brands } = useQuery(brandQueries.list());
  const { data: countries } = useQuery(countryQueries.list());

  const brandName = (id: string) => brands?.find((b) => b.id === id)?.name ?? id;
  const countryName = (id: string) => countries?.find((c) => c.id === id)?.name ?? id;

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? deactivateDenomination(id) : activateDenomination(id),
    onSuccess: () => {
      toast.success("Updated.");
      qc.invalidateQueries({ queryKey: queryKeys.denominations.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Brand", "Country", "Amount", "Currency", "Type", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-medium">{d.brandName || brandName(d.brandId)}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{d.countryName || countryName(d.countryId)}</td>
                    <td className="px-6 py-3.5 font-mono">{d.amount}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{d.currencyCode}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={d.cardType} dot={false} /></td>
                    <td className="px-6 py-3.5"><StatusBadge status={d.isActive ? "Active" : "Paused"} /></td>
                    <td className="px-6 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleMutation.mutate({ id: d.id, active: d.isActive })}>
                            {d.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(data?.items ?? []).length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rates ─────────────────────────────────────────────────────────────────────

function RatesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(rateQueries.list({ ActiveOnly: true, PageSize: 100 }));
  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (rateId: string) => deactivateRate(rateId),
    onSuccess: () => {
      toast.success("Rate deactivated.");
      qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openUpdateRate(r: (typeof data)["items"][number]) {
    setRateFor({
      id: r.denominationId,
      amount: r.amount,
      currencyCode: r.currencyCode,
      cardType: r.cardType,
      brandName: r.brandName,
      countryCode: r.countryName, // countryCode not in list response; countryName used for display
      activeRate: r.rateId ? {
        id: r.rateId,
        marketRateUsd: r.marketRateUsd,
        customerRateUsd: r.customerRateUsd,
        markupUsd: r.markupUsd,
        markupType: r.markupType ?? "",
        markupValue: r.markupValue,
        source: r.rateSource ?? "",
        validFrom: r.rateValidFrom ?? "",
      } : null,
    });
  }

  return (
    <div className="space-y-4">
      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Brand", "Country", "Denom", "Mkt Rate", "Cust Rate", "Markup", "Valid From", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).filter((r) => r.hasRate).map((r) => (
                  <tr key={r.denominationId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-medium">{r.brandName}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{r.countryName}</td>
                    <td className="px-6 py-3.5 font-mono">{r.currencyCode} {r.amount}</td>
                    <td className="px-6 py-3.5 font-mono">${r.marketRateUsd.toFixed(4)}</td>
                    <td className="px-6 py-3.5 font-mono">${r.customerRateUsd.toFixed(4)}</td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {r.markupType === "Percentage" ? `${r.markupValue}%` : `$${r.markupValue}`}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {r.rateValidFrom ? formatDate(r.rateValidFrom) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openUpdateRate(r)}>
                          Update Rate
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive"
                              onClick={() => r.rateId && deactivateMutation.mutate(r.rateId)}>
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.items ?? []).length === 0 && <EmptyRow cols={8} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SetRateDialog
        denom={rateFor}
        onClose={() => {
          setRateFor(null);
          qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
        }}
      />
    </div>
  );
}

// ── FX Rates ─────────────────────────────────────────────────────────────────

function FxTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("NGN");
  const [rate, setRate] = useState("");
  const [historyCurrency, setHistoryCurrency] = useState<string | null>(null);

  const { data, isLoading } = useQuery(fxRateQueries.current());
  const { data: historyData, isLoading: historyLoading } = useQuery({
    ...fxRateQueries.history(historyCurrency ?? "NGN"),
    enabled: historyCurrency !== null,
  });

  const mutation = useMutation({
    mutationFn: () => setFxRate({ baseCurrency: base, quoteCurrency: quote, rate: parseFloat(rate), source: "Admin" }),
    onSuccess: () => {
      toast.success("FX rate updated.");
      qc.invalidateQueries({ queryKey: queryKeys.fxRates.all() });
      setRate(""); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Set Rate</Button>
      </div>
      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Pair", "Rate", "Source", "Valid From", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((fx, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-mono font-semibold">{fx.baseCurrency}/{fx.quoteCurrency}</td>
                  <td className="px-6 py-3.5 font-mono">{fx.rate.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-muted-foreground">{fx.source ?? "—"}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">
                    {formatDateTime(fx.validFrom)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                      onClick={() => setHistoryCurrency(historyCurrency === fx.quoteCurrency ? null : fx.quoteCurrency)}>
                      <History className="h-3.5 w-3.5" />
                      {historyCurrency === fx.quoteCurrency ? "Hide" : "History"}
                    </Button>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <EmptyRow cols={5} />}
            </tbody>
          </table>
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
                    <td className="px-6 py-3 font-mono font-semibold">{h.baseCurrency}/{h.quoteCurrency}</td>
                    <td className="px-6 py-3 font-mono">{h.rate.toLocaleString()}</td>
                    <td className="px-6 py-3 text-muted-foreground">{h.source ?? "—"}</td>
                    <td className="px-6 py-3">
                      {h.isCurrent
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Current</span>
                        : <span className="text-xs text-muted-foreground">Superseded</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {formatDateTime(h.validFrom)}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {h.validTo ? formatDateTime(h.validTo) : "—"}
                    </td>
                  </tr>
                ))}
                {!historyLoading && (historyData ?? []).length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set FX Rate</DialogTitle><DialogDescription>Set the exchange rate between two currencies.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Base currency</label>
                <Input value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} className="font-mono" maxLength={3} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quote currency</label>
                <Input value={quote} onChange={(e) => setQuote(e.target.value.toUpperCase())} className="font-mono" maxLength={3} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rate (1 {base} = ? {quote})</label>
              <Input value={rate} onChange={(e) => setRate(e.target.value)} type="number" placeholder="e.g. 1650" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!rate || isNaN(parseFloat(rate)) || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Set Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Payout Currencies ─────────────────────────────────────────────────────────

function PayoutCurrenciesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const { data, isLoading } = useQuery(payoutCurrencyQueries.list());

  const createMutation = useMutation({
    mutationFn: () => createPayoutCurrency({ code: code.trim().toUpperCase(), name: name.trim(), symbol: symbol.trim() }),
    onSuccess: () => {
      toast.success("Payout currency added.");
      qc.invalidateQueries({ queryKey: queryKeys.payoutCurrencies.all() });
      setCode(""); setName(""); setSymbol(""); setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ code, active }: { code: string; active: boolean }) =>
      active ? deactivatePayoutCurrency(code) : activatePayoutCurrency(code),
    onSuccess: () => {
      toast.success("Updated.");
      qc.invalidateQueries({ queryKey: queryKeys.payoutCurrencies.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Currency</Button>
      </div>
      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Code", "Name", "Symbol", "Status", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.code} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-mono font-semibold">{p.code}</td>
                  <td className="px-6 py-3.5">{p.name}</td>
                  <td className="px-6 py-3.5 font-mono">{p.symbol}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={p.isActive ? "Active" : "Paused"} /></td>
                  <td className="px-6 py-3.5 text-right">
                    <Button size="sm" variant="outline"
                      onClick={() => toggleMutation.mutate({ code: p.code, active: p.isActive })}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <EmptyRow cols={5} />}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payout Currency</DialogTitle><DialogDescription>Add a currency users can receive payouts in.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Code (ISO) *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. NGN" className="font-mono" maxLength={3} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nigerian Naira" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Symbol *</label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. ₦" className="font-mono" />
            </div>
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

// ── Shared helpers ─────────────────────────────────────────────────────────────

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-6 py-10 text-center text-sm text-muted-foreground">No data yet.</td>
    </tr>
  );
}
