import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SetRateDialog, type DenomRateContext } from "@/components/plut/SetRateDialog";
import { RateHistoryDrawer } from "@/components/plut/RateHistoryDrawer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, AlertTriangle, Loader2, History } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";
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
import { formatDate, formatDateTime, currencySymbol } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Plut Admin" }] }),
  loader: ({ context }) => {
    // Warm the cache for every tab so switching tabs / opening Set Rate is instant.
    const qc = context.queryClient;
    qc.prefetchQuery(countryQueries.list());
    qc.prefetchQuery(brandQueries.list());
    qc.prefetchQuery(denominationQueries.list({ PageSize: 100 }));
    qc.prefetchQuery(rateQueries.list({ PageSize: 100 }));
    qc.prefetchQuery(fxRateQueries.current());
    qc.prefetchQuery(payoutCurrencyQueries.list());
  },
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
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Name", "Code", "Currency", "Brands Linked"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-medium">{c.name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs">{c.code}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{c.currencyCode}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.linkedBrands.slice(0, 3).map((b) => (
                          <Link key={b.id} to="/admin/giftcards/brands/$brandId" params={{ brandId: b.id }}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs transition-colors hover:bg-primary/15 hover:text-primary">
                            {b.imageUrl
                              ? <img src={b.imageUrl} alt="" className="h-3 w-3 rounded-sm object-contain" />
                              : <span className="font-semibold text-[10px]">{b.name[0]}</span>}
                            {b.name}
                          </Link>
                        ))}
                        {c.linkedBrands.length > 3 && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">+{c.linkedBrands.length - 3}</span>
                        )}
                        {c.linkedBrands.length === 0 && (
                          <span className="text-xs text-muted-foreground">No brands yet</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && <EmptyRow cols={4} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Country</DialogTitle>
            <DialogDescription>Register a new country with its currency.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Country name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="United States" />
            </Field>
            <Field label="Country code * (ISO 3166 Alpha-2)">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="US" maxLength={3} className="font-mono" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!name.trim() || !code.trim() || mutation.isPending}>
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
  const [brandFilter, setBrandFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<{ label: string } | null>(null);
  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);

  const { data, isLoading } = useQuery(denominationQueries.list({ PageSize: 100 }));
  const { data: brands } = useQuery(brandQueries.list());
  const { data: countries } = useQuery(countryQueries.list());

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? deactivateDenomination(id) : activateDenomination(id),
    onSuccess: () => {
      toast.success("Updated.");
      qc.invalidateQueries({ queryKey: queryKeys.denominations.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (data?.items ?? [])
    .filter((d) => brandFilter === "All" || d.brandId === brandFilter)
    .filter((d) => countryFilter === "All" || d.countryId === countryFilter)
    .filter((d) => typeFilter === "All" || d.cardType === typeFilter)
    .filter((d) => statusFilter === "All" || (statusFilter === "Active" ? d.isActive : !d.isActive));

  return (
    <div className="space-y-4">
      {justAdded && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span>
              <span className="font-semibold">{justAdded.label}</span>{" "}
              <span className="text-muted-foreground">— Rate not set.</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => toast.info("Open the Rates tab and click Set Rate for this denomination.")}>
              Set rate now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setJustAdded(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brandFilter} onChange={setBrandFilter} placeholder="Brand"
          options={[{ v: "All", l: "All brands" }, ...(brands ?? []).map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={countryFilter} onChange={setCountryFilter} placeholder="Country"
          options={[{ v: "All", l: "All countries" }, ...(countries ?? []).map((c) => ({ v: c.id, l: c.name }))]} />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Type"
          options={[{ v: "All", l: "All types" }, { v: "Physical", l: "Physical" }, { v: "ECode", l: "E-code" }]} />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status"
          options={[{ v: "All", l: "All statuses" }, { v: "Active", l: "Active" }, { v: "Inactive", l: "Inactive" }]} />
        <span className="ml-auto text-xs text-muted-foreground">{list.length} denomination{list.length === 1 ? "" : "s"}</span>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Denomination</Button>
      </div>

      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Brand", "Country", "Amount", "Currency", "Type", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const b = brands?.find((x) => x.id === d.brandId);
                  const c = countries?.find((x) => x.id === d.countryId);
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-6 py-3.5">
                        <Link to="/admin/giftcards/brands/$brandId" params={{ brandId: d.brandId }} className="inline-flex items-center gap-2 hover:text-primary">
                          {b?.imageUrl
                            ? <img src={b.imageUrl} alt="" className="h-4 w-4 rounded object-contain" />
                            : <span className="text-sm">{b?.name[0] ?? "?"}</span>}
                          {d.brandName}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">{c?.code ?? d.countryName}</td>
                      <td className="px-6 py-3.5 font-mono">{currencySymbol(d.currencyCode)}{d.amount}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{d.currencyCode}</td>
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
                  );
                })}
                {list.length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddDenominationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <SetRateDialog denom={rateFor} onClose={() => setRateFor(null)} />
    </div>
  );
}

// ── Rates ─────────────────────────────────────────────────────────────────────

function RatesTab() {
  const qc = useQueryClient();

  const [brandFilter, setBrandFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [activeOnly, setActiveOnly] = useState(true);
  const [view, setView] = useState("USD");

  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);
  const [historyFor, setHistoryFor] = useState<DenomRateContext | null>(null);

  const { data, isLoading } = useQuery(rateQueries.list({ PageSize: 100 }));
  const { data: brandsData } = useQuery(brandQueries.list());
  const { data: countriesData } = useQuery(countryQueries.list());
  const { data: fxRates } = useQuery(fxRateQueries.current());
  const { data: payouts } = useQuery(payoutCurrencyQueries.list());

  const activePayout = (payouts ?? []).filter((p) => p.isActive);
  const viewFxRate = view === "USD"
    ? 1
    : fxRates?.find((f) => f.baseCurrency === "USD" && f.quoteCurrency === view)?.rate ?? 0;

  const deactivateMutation = useMutation({
    mutationFn: (rateId: string) => deactivateRate(rateId),
    onSuccess: () => {
      toast.success("Rate deactivated.");
      qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function buildContext(r: NonNullable<typeof data>["items"][number]): DenomRateContext {
    return {
      id: r.denominationId,
      amount: r.amount,
      currencyCode: r.currencyCode,
      cardType: r.cardType,
      brandName: r.brandName,
      countryCode: r.countryName,
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
    };
  }

  const filtered = (data?.items ?? [])
    .filter((r) => brandFilter === "All" || r.brandId === brandFilter)
    .filter((r) => countryFilter === "All" || r.countryId === countryFilter)
    .filter((r) => activeOnly ? r.hasRate : true);

  const supplierLabel = (r: NonNullable<typeof data>["items"][number]) => {
    if (!r.hasRate) return "—";
    if (r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar) {
      return `${r.acquisitionRatePerCardDollar} CNY / $1`;
    }
    return "Direct USD";
  };

  const viewSym = view === "USD" ? "$" : (currencySymbol(view) || activePayout.find((p) => p.code === view)?.symbol || view);
  const usdHeaders = ["Brand", "Country", "Denom", "Supplier Quote", "Mkt Rate", "Cust Rate", "Margin", "Src", "Since", ""];
  const curHeaders = ["Brand", "Country", "Denom", "Supplier Quote", `Cost (${view})`, `Payout (${view})`, `Margin (${view})`, "Src", ""];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brandFilter} onChange={setBrandFilter} placeholder="Brand"
          options={[{ v: "All", l: "All brands" }, ...(brandsData ?? []).map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={countryFilter} onChange={setCountryFilter} placeholder="Country"
          options={[{ v: "All", l: "All countries" }, ...(countriesData ?? []).map((c) => ({ v: c.id, l: c.name }))]} />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={activeOnly} onCheckedChange={(v) => setActiveOnly(!!v)} />
          Active only
        </label>
        <div className="flex items-center gap-1 rounded-md border bg-secondary/40 p-0.5">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">View</span>
          {["USD", ...activePayout.map((p) => p.code)].map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${view === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {v}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} rate{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {view !== "USD" && viewFxRate > 0 && (
        <p className="text-xs text-muted-foreground">
          Using FX rate: <span className="font-mono font-semibold text-foreground">USD/{view} {viewSym}{viewFxRate.toLocaleString()}</span>
        </p>
      )}

      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {(view === "USD" ? usdHeaders : curHeaders).map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const margin = r.marketRateUsd ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100 : 0;
                  const cost = r.marketRateUsd * r.amount * viewFxRate;
                  const payout = r.customerRateUsd * r.amount * viewFxRate;
                  const marginCur = cost - payout;
                  const ctx = buildContext(r);

                  return (
                    <tr key={r.denominationId}
                      onClick={() => r.hasRate && setHistoryFor(ctx)}
                      className={`border-b border-border last:border-0 hover:bg-secondary/40 ${r.hasRate ? "cursor-pointer" : ""}`}>
                      <td className="px-6 py-3.5 font-medium">{r.brandName}</td>
                      <td className="px-6 py-3.5 text-muted-foreground">{r.countryName}</td>
                      <td className="px-6 py-3.5 font-mono">{currencySymbol(r.currencyCode)}{r.amount}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{supplierLabel(r)}</td>

                      {view === "USD" ? (
                        <>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `$${r.marketRateUsd.toFixed(3)}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `$${r.customerRateUsd.toFixed(3)}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `${margin.toFixed(1)}%` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.hasRate ? (r.rateSource === "Admin" ? "M" : "A") : "—"}</td>
                          <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.rateValidFrom ? formatDate(r.rateValidFrom) : "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-3.5 text-right font-mono">{r.hasRate ? `${viewSym}${cost.toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono font-semibold">{r.hasRate ? `${viewSym}${payout.toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{r.hasRate ? `+${viewSym}${marginCur.toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : <Dash />}</td>
                          <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.hasRate ? (r.rateSource === "Admin" ? "M" : "A") : "—"}</td>
                        </>
                      )}

                      <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant={r.hasRate ? "outline" : "default"} onClick={() => setRateFor(ctx)}>
                            {r.hasRate ? "Update" : "Set Rate"}
                          </Button>
                          {r.hasRate && (
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
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <EmptyRow cols={view === "USD" ? 10 : 9} />}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border bg-secondary/30 px-6 py-2 text-[11px] text-muted-foreground">
            Legend: M = Manual, A = Auto · Click any row to see rate history · Supplier Quote shows the input mode used.
          </p>
        </div>
      )}

      <SetRateDialog
        denom={rateFor}
        onClose={() => { setRateFor(null); qc.invalidateQueries({ queryKey: queryKeys.rates.all() }); }}
      />
      <RateHistoryDrawer
        denom={historyFor}
        onClose={() => setHistoryFor(null)}
        onSetNew={(ctx) => { setHistoryFor(null); setRateFor(ctx); }}
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

// ── Payout Currencies ─────────────────────────────────────────────────────────

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

// ── Shared helpers ─────────────────────────────────────────────────────────────

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

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

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}
