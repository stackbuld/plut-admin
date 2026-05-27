import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, MoreHorizontal, AlertTriangle, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/plut/StatusBadge";
import {
  brands, countries, denominations, rates, brandById, countryById, fxRates,
  payoutCurrencies, activePayoutCurrencies, activeFxRate,
  type PayoutCurrency,
} from "@/data/mock";
import { toast } from "sonner";
import { SetRateDialog } from "@/components/plut/SetRateDialog";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";
import { RateHistoryDrawer } from "@/components/plut/RateHistoryDrawer";
import { currencySymbol } from "@/lib/format";

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

function CountriesTab() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [cur, setCur] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Country</Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Name", "Code", "Currency", "Brands Linked"].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {countries.map((c) => {
              const linked = brands.filter((b) => b.countryIds.includes(c.id));
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-medium">{c.flag} {c.name}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{c.code}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{c.currency}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {linked.slice(0, 3).map((b) => (
                        <Link key={b.id} to="/admin/giftcards/brands/$brandId" params={{ brandId: b.id }}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs transition-colors hover:bg-primary/15 hover:text-primary">
                          <span>{b.logoEmoji}</span>{b.name}
                        </Link>
                      ))}
                      {linked.length > 3 && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">+{linked.length - 3}</span>}
                      {linked.length === 0 && <span className="text-xs text-muted-foreground">No brands yet</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Country</DialogTitle><DialogDescription>Register a new country with its currency.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Field label="Country name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="United States" /></Field>
            <Field label="Country code * (ISO 3166 Alpha-2)"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="US" maxLength={2} className="font-mono" /></Field>
            <Field label="Currency code * (ISO 4217)"><Input value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} placeholder="USD" className="font-mono" /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!name || !code || !cur) { toast.error("All fields required"); return; } toast.success(`Country ${name} added.`); setOpen(false); setName(""); setCode(""); setCur(""); }}>Add Country</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DenominationsTab() {
  const [brand, setBrand] = useState("All"); const [country, setCountry] = useState("All"); const [type, setType] = useState("All"); const [status, setStatus] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<{ label: string; denomId: string | null } | null>(null);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const list = denominations
    .filter((d) => brand === "All" || d.brandId === brand)
    .filter((d) => country === "All" || d.countryId === country)
    .filter((d) => type === "All" || d.cardType === type)
    .filter((d) => status === "All" || (status === "Active" ? d.active : !d.active));

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (justAdded.denomId) setRateFor(justAdded.denomId);
                else toast.info("Open the Rates tab and click Set Rate for this denomination.");
              }}
            >
              Set rate now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setJustAdded(null)}>Dismiss</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brand} onChange={setBrand} placeholder="Brand" options={[{ v: "All", l: "All brands" }, ...brands.map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={[{ v: "All", l: "All countries" }, ...countries.map((c) => ({ v: c.id, l: c.name }))]} />
        <FilterSelect value={type} onChange={setType} placeholder="Type" options={[{ v: "All", l: "All types" }, { v: "Physical", l: "Physical" }, { v: "E-code", l: "E-code" }]} />
        <FilterSelect value={status} onChange={setStatus} placeholder="Status" options={[{ v: "All", l: "All statuses" }, { v: "Active", l: "Active" }, { v: "Inactive", l: "Inactive" }]} />
        <span className="ml-auto text-xs text-muted-foreground">{list.length} denomination{list.length === 1 ? "" : "s"}</span>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Denomination</Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Brand", "Country", "Amount", "Currency", "Type", "Status", ""].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {list.map((d) => {
              const b = brandById(d.brandId); const c = countryById(d.countryId);
              return (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5">
                    <Link to="/admin/giftcards/brands/$brandId" params={{ brandId: d.brandId }} className="hover:text-primary">
                      {b?.logoEmoji} {b?.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">{c?.flag} {c?.code}</td>
                  <td className="px-6 py-3.5 font-mono">{currencySymbol(d.currency)}{d.amount}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{d.currency}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={d.cardType} dot={false} /></td>
                  <td className="px-6 py-3.5"><StatusBadge status={d.active ? "Active" : "Inactive"} /></td>
                  <td className="px-6 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.success(`${d.active ? "Deactivated" : "Activated"} denomination.`)}>
                          {d.active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
      <AddDenominationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(info) => {
          if (info.hasRate) return;
          const b = brandById(info.brandId);
          const c = countryById(info.countryId);
          // Mock: pick any existing denom without a rate so the Set Rate modal can preview the flow.
          const fallback = denominations.find((d) => !rates.some((r) => r.denominationId === d.id && r.active));
          setJustAdded({
            label: `${b?.logoEmoji ?? ""} ${b?.name} ${currencySymbol(c?.currency ?? "USD")}${info.face} ${info.type} · ${c?.code}`,
            denomId: fallback?.id ?? null,
          });
        }}
      />
      <SetRateDialog denomId={rateFor} onClose={() => setRateFor(null)} />
    </div>
  );
}

function RatesTab() {
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [brand, setBrand] = useState("All"); const [country, setCountry] = useState("All"); const [activeOnly, setActiveOnly] = useState(true);
  const payouts = activePayoutCurrencies();
  const [view, setView] = useState<string>("USD"); // USD | NGN | GHS | …
  const list = rates
    .filter((r) => {
      const d = denominations.find((x) => x.id === r.denominationId);
      if (!d) return false;
      if (brand !== "All" && d.brandId !== brand) return false;
      if (country !== "All" && d.countryId !== country) return false;
      if (activeOnly && !r.active) return false;
      return true;
    });
  const viewFx = view === "USD" ? 1 : activeFxRate(view, "USD");
  const viewSym = view === "USD" ? "$" : currencySymbol(view);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brand} onChange={setBrand} placeholder="Brand" options={[{ v: "All", l: "All brands" }, ...brands.map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={[{ v: "All", l: "All countries" }, ...countries.map((c) => ({ v: c.id, l: c.name }))]} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={activeOnly} onCheckedChange={(v) => setActiveOnly(!!v)} /> Active only
        </label>
        <div className="flex items-center gap-1.5 rounded-md border bg-secondary/40 p-0.5">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">View</span>
          {["USD", ...payouts.map((p) => p.code)].map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${view === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{list.length} rate{list.length === 1 ? "" : "s"}</span>
      </div>
      {view !== "USD" && (
        <p className="text-xs text-muted-foreground">
          Using FX rate: <span className="font-mono font-semibold text-foreground">USD/{view} {viewSym}{viewFx.toLocaleString()}</span>
        </p>
      )}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {(view === "USD"
              ? ["Brand", "Country", "Denom", "Supplier Quote", "Mkt Rate", "Cust Rate", "Margin", "Src", "Since", ""]
              : ["Brand", "Country", "Denom", "Supplier Quote", `Cost (${view})`, `Payout (${view})`, `Margin (${view})`, "Src", ""]
            ).map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {list.map((r) => {
              const d = denominations.find((x) => x.id === r.denominationId)!;
              const b = brandById(d.brandId); const c = countryById(d.countryId);
              const markup = ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100;
              const supplier = r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar
                ? `${r.acquisitionRatePerCardDollar} CNY / $1`
                : r.supplierNgnPerDollar
                  ? `₦${r.supplierNgnPerDollar.toLocaleString()} / $1`
                  : "Direct USD";
              const cost = r.marketRateUsd * d.amount * viewFx;
              const payout = r.customerRateUsd * d.amount * viewFx;
              const marginCur = cost - payout;
              return (
                <tr key={r.id} onClick={() => setHistoryFor(d.id)} className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5">
                    <Link onClick={(e) => e.stopPropagation()} to="/admin/giftcards/brands/$brandId" params={{ brandId: d.brandId }} className="hover:text-primary">
                      {b?.logoEmoji} {b?.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">{c?.code}</td>
                  <td className="px-6 py-3.5 font-mono">{currencySymbol(d.currency)}{d.amount}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{supplier}</td>
                  {view === "USD" ? (
                    <>
                      <td className="px-6 py-3.5 text-right font-mono">${r.marketRateUsd.toFixed(3)}</td>
                      <td className="px-6 py-3.5 text-right font-mono">${r.customerRateUsd.toFixed(3)}</td>
                      <td className="px-6 py-3.5 text-right font-mono">{markup.toFixed(1)}%</td>
                      <td className="px-6 py-3.5 text-xs">{r.source === "Manual" ? "M" : "A"}</td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.validFrom}</td>
                      <td className="px-6 py-3.5 text-right">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRateFor(r.denominationId); }}>Update</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3.5 text-right font-mono">{viewSym}{cost.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold">{viewSym}{payout.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">+{viewSym}{marginCur.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</td>
                      <td className="px-6 py-3.5 text-xs">{r.source === "Manual" ? "M" : "A"}</td>
                    </>
                  )}
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={10} className="px-6 py-12 text-center text-sm text-muted-foreground">No rates match these filters.</td></tr>
            )}
          </tbody>
        </table></div>
        <p className="border-t border-border bg-secondary/30 px-6 py-2 text-[11px] text-muted-foreground">
          Legend: M = Manual, A = Auto · Click any row to see rate history · Supplier Quote shows the input mode used.
        </p>
      </div>
      <SetRateDialog denomId={rateFor} onClose={() => setRateFor(null)} />
      <RateHistoryDrawer denomId={historyFor} onClose={() => setHistoryFor(null)} onSetNew={(id) => setRateFor(id)} />
    </div>
  );
}

function FxTab() {
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState<"USD" | "CNY" | "GHS">("USD"); const [quote, setQuote] = useState("NGN");
  const [rate, setRate] = useState(""); const [src, setSrc] = useState<"Manual" | "Auto">("Manual");
  // Type derived from pair
  const fxType = (b: string) => (b === "USD" ? "Payout" : "Acquisition");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Two types live here: <b>Payout rates</b> (USD → local currency) and <b>Acquisition rates</b> (CNY → NGN). Old rates are archived as immutable history.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Set FX Rate</Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Pair", "Rate", "Type", "Source", "Valid From", "Status"].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {fxRates.map((f) => {
              const active = f.validTo === null;
              const type = fxType(f.baseCurrency);
              return (
                <tr key={f.id} className={active ? "border-b border-border bg-primary/5 last:border-0" : "border-b border-border last:border-0 hover:bg-secondary/40"}>
                  <td className="px-6 py-3.5 font-mono text-xs">{f.baseCurrency}/{f.quoteCurrency}</td>
                  <td className="px-6 py-3.5 font-mono">{currencySymbol(f.quoteCurrency)}{f.rate.toLocaleString()}</td>
                  <td className="px-6 py-3.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${type === "Payout" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>{type}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs">{f.source}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{f.validFrom}</td>
                  <td className="px-6 py-3.5 text-xs">
                    {active
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">● Active</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Expired</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set FX Rate</DialogTitle><DialogDescription>Sets the active conversion rate. The previous rate is archived.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Base Currency *">
                <Select value={base} onValueChange={(v) => setBase(v as typeof base)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD — payout rate</SelectItem>
                    <SelectItem value="CNY">CNY — acquisition rate</SelectItem>
                    <SelectItem value="GHS">GHS — payout rate</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quote Currency *">
                <Select value={quote} onValueChange={setQuote}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activePayoutCurrencies().map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={`Rate (${quote} per 1 ${base}) *`}>
              <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1550.00" className="font-mono" />
            </Field>
            <Field label="Source">
              <Select value={src} onValueChange={(v) => setSrc(v as typeof src)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Manual">Manual</SelectItem><SelectItem value="Auto">Auto</SelectItem></SelectContent>
              </Select>
            </Field>
            <p className="flex items-start gap-2 rounded-lg border bg-warning/10 p-2.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Setting a new rate immediately affects all payout previews. The previous rate is archived.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!parseFloat(rate)) { toast.error("Rate required"); return; } toast.success(`FX rate set: ${base}/${quote} ${rate}`); setOpen(false); setRate(""); }}>Set FX Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutCurrenciesTab() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [symbol, setSymbol] = useState(""); const [initRate, setInitRate] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Currencies customers can receive payouts in. <b>Active</b> currencies appear across the Set Rate modal, payout previews, and customer quotes.
          <b> Draft</b> currencies are registered but hidden until a USD/FX rate is set.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Currency</Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Code", "Name", "Symbol", "USD/FX Rate", "Status", ""].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {payoutCurrencies.map((c: PayoutCurrency) => {
              const fx = activeFxRate(c.code, "USD");
              const hasRate = fx > 0 && c.code !== "USD";
              return (
                <tr key={c.code} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold">{c.code}</td>
                  <td className="px-6 py-3.5">{c.name}</td>
                  <td className="px-6 py-3.5 font-mono">{c.symbol}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{hasRate ? `${c.symbol}${fx.toLocaleString()}` : <span className="text-muted-foreground">No rate set</span>}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info("Opens Set FX Rate modal pre-filled.")}>Set FX Rate</DropdownMenuItem>
                        {c.status === "Inactive" ? (
                          <DropdownMenuItem onClick={() => toast.success(`Activated ${c.code}.`)}>Activate</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => toast.success(`Deactivated ${c.code}.`)}>Deactivate</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="border-t border-border bg-amber-500/5 px-6 py-2 text-[11px] text-amber-700 dark:text-amber-400">
          ⚠ Draft currencies are hidden from the rest of the app until you set a USD/FX rate for them in the FX Rates tab.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payout Currency</DialogTitle>
            <DialogDescription>Register a new local currency that customers can receive payouts in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="ISO Code * (e.g. KES)"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={3} placeholder="KES" className="font-mono" /></Field>
              <Field label="Symbol *"><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="KSh" className="font-mono" /></Field>
            </div>
            <Field label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kenyan Shilling" /></Field>
            <Field label="Initial USD / [currency] rate (optional)">
              <Input type="number" step="0.01" value={initRate} onChange={(e) => setInitRate(e.target.value)} placeholder="130.50" className="font-mono" />
              <p className="mt-1 text-xs text-muted-foreground">If set, the currency becomes Active immediately. Otherwise it starts as Draft.</p>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!code || !name || !symbol) { toast.error("Code, name and symbol are required"); return; }
              toast.success(`${code} added as ${initRate ? "Active" : "Draft"}.`);
              setOpen(false); setCode(""); setName(""); setSymbol(""); setInitRate("");
            }}>Add Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { v: string; l: string }[] }) {
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
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label>{children}</div>;
}