import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Target, Wallet, Percent, Pencil, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  denominations,
  brandById,
  countryById,
  activeRateForDenom,
  activeFxRate,
  activePayoutCurrencies,
} from "@/data/mock";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

type SupplierMode = "NGN" | "CNY" | "USD";
type CustomerMode = "profit" | "payout" | "manual";

export function SetRateDialog({ denomId, onClose }: { denomId: string | null; onClose: () => void }) {
  const open = denomId !== null;
  const d = useMemo(() => denominations.find((x) => x.id === denomId), [denomId]);
  const r = d ? activeRateForDenom(d.id) : null;
  const brand = d ? brandById(d.brandId) : null;
  const country = d ? countryById(d.countryId) : null;

  // Live FX rates (editable inline)
  const [usdNgn, setUsdNgn] = useState(activeFxRate("NGN", "USD"));
  const [cnyNgn, setCnyNgn] = useState(activeFxRate("NGN", "CNY"));
  const payoutCurs = activePayoutCurrencies();

  // Section 1
  const [supplierMode, setSupplierMode] = useState<SupplierMode>("NGN");
  const [ngnInput, setNgnInput] = useState("");
  const [cnyInput, setCnyInput] = useState("");
  const [usdInput, setUsdInput] = useState("");

  // Section 4
  const [custMode, setCustMode] = useState<CustomerMode>("profit");
  const [marginPct, setMarginPct] = useState("");
  const [targetNgn, setTargetNgn] = useState("");
  const [manualUsd, setManualUsd] = useState("");

  const [source, setSource] = useState<"Manual" | "Auto">("Manual");

  useEffect(() => {
    if (!open) return;
    setUsdNgn(activeFxRate("NGN", "USD"));
    setCnyNgn(activeFxRate("NGN", "CNY"));
    if (r) {
      // Pre-fill based on what was stored
      if (r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar) {
        setSupplierMode("CNY");
        setCnyInput(String(r.acquisitionRatePerCardDollar));
      } else if (r.supplierNgnPerDollar) {
        setSupplierMode("NGN");
        setNgnInput(String(r.supplierNgnPerDollar));
      } else {
        setSupplierMode("USD");
        setUsdInput(String(r.marketRateUsd));
      }
      setCustMode("profit");
      setMarginPct(String(r.markupValue));
      setSource(r.source);
    } else {
      setSupplierMode("NGN");
      setNgnInput(""); setCnyInput(""); setUsdInput("");
      setCustMode("profit"); setMarginPct("8"); setTargetNgn(""); setManualUsd("");
      setSource("Manual");
    }
  }, [denomId, r, open]);

  // Derive MarketRateUsd from supplier mode
  let marketRateUsd = 0;
  let acquisitionCostNgn = 0;
  if (supplierMode === "NGN") {
    acquisitionCostNgn = parseFloat(ngnInput) || 0;
    marketRateUsd = usdNgn ? acquisitionCostNgn / usdNgn : 0;
  } else if (supplierMode === "CNY") {
    const cny = parseFloat(cnyInput) || 0;
    const cnyUsd = usdNgn ? cnyNgn / usdNgn : 0;
    marketRateUsd = cny * cnyUsd;
    acquisitionCostNgn = cny * cnyNgn;
  } else {
    marketRateUsd = parseFloat(usdInput) || 0;
    acquisitionCostNgn = marketRateUsd * usdNgn;
  }

  // Derive CustomerRateUsd
  let customerRateUsd = 0;
  if (custMode === "profit") {
    const m = parseFloat(marginPct) || 0;
    customerRateUsd = marketRateUsd * (1 - m / 100);
  } else if (custMode === "payout") {
    const t = parseFloat(targetNgn) || 0;
    customerRateUsd = usdNgn ? t / usdNgn : 0;
  } else {
    customerRateUsd = parseFloat(manualUsd) || 0;
  }
  customerRateUsd = Math.max(0, customerRateUsd);

  const marginAbs = Math.max(0, marketRateUsd - customerRateUsd);
  const marginPctCalc = marketRateUsd ? (marginAbs / marketRateUsd) * 100 : 0;
  const valid = marketRateUsd > 0 && customerRateUsd > 0 && customerRateUsd <= marketRateUsd;

  const submit = async () => {
    if (!marketRateUsd) { toast.error("Enter the supplier quote"); return; }
    if (customerRateUsd <= 0) { toast.error("Customer rate must be positive"); return; }
    if (customerRateUsd > marketRateUsd) { toast.error("Customer rate cannot exceed market rate"); return; }
    await new Promise((res) => setTimeout(res, 350));
    toast.success("Rate saved.", {
      description: `Mkt $${marketRateUsd.toFixed(4)} · Cust $${customerRateUsd.toFixed(4)} · ${marginPctCalc.toFixed(1)}% margin`,
    });
    onClose();
  };

  if (!d) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {r ? "Update Rate" : "Set Rate"}
            <span className="text-muted-foreground">·</span>
            <span className="font-normal">{brand?.logoEmoji} {brand?.name} / {country?.code} / {currencySymbol(d.currency)}{d.amount} {d.cardType}</span>
          </DialogTitle>
          <DialogDescription>Enter the supplier quote — we handle the FX and customer payout math.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Section 1 — Supplier Quote */}
          <Section n="1" title="Supplier Quote" subtitle="How did the supplier express the price?">
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border bg-secondary/40 p-1">
              <ModeTab active={supplierMode === "NGN"} onClick={() => setSupplierMode("NGN")} label="NGN / $1" sub="recommended" />
              <ModeTab active={supplierMode === "CNY"} onClick={() => setSupplierMode("CNY")} label="CNY / $1" sub="RMB rate" />
              <ModeTab active={supplierMode === "USD"} onClick={() => setSupplierMode("USD")} label="USD / $1" sub="direct" />
            </div>

            {supplierMode === "NGN" && (
              <Field label="Naira per $1 of face value *" hint="From supplier message: e.g. “$100 = 109,620 naira” → enter 1,096.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">₦</span>
                  <Input type="number" value={ngnInput} onChange={(e) => setNgnInput(e.target.value)} className="pl-7 font-mono" placeholder="1096" />
                </div>
              </Field>
            )}
            {supplierMode === "CNY" && (
              <Field label="RMB per $1 of face value *" hint="From supplier message: e.g. “$100 = 5.4 RMB” → enter 5.4.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">¥</span>
                  <Input type="number" step="0.01" value={cnyInput} onChange={(e) => setCnyInput(e.target.value)} className="pl-7 font-mono" placeholder="5.4" />
                </div>
              </Field>
            )}
            {supplierMode === "USD" && (
              <Field label="Market rate (USD per $1) *" hint="Direct USD acquisition cost per $1 of card face value.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">$</span>
                  <Input type="number" step="0.001" value={usdInput} onChange={(e) => setUsdInput(e.target.value)} className="pl-7 font-mono" placeholder="0.707" />
                </div>
              </Field>
            )}
          </Section>

          {/* Section 2 — Live FX */}
          <Section n="2" title="Live FX Rates" subtitle="Used for all derivations below. Edit inline if the market has moved.">
            <div className="grid grid-cols-2 gap-3">
              <FxInline label="USD / NGN" value={usdNgn} onChange={setUsdNgn} symbol="₦" />
              <FxInline label="CNY / NGN" value={cnyNgn} onChange={setCnyNgn} symbol="₦" disabled={supplierMode !== "CNY"} />
            </div>
          </Section>

          {/* Section 3 — Acquisition Cost */}
          <Section n="3" title="Acquisition Cost" subtitle="What Plut effectively pays per $1 of card face value.">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {payoutCurs.map((pc) => {
                    const fx = activeFxRate(pc.code, "USD") || (pc.code === "NGN" ? usdNgn : 0);
                    const cost = marketRateUsd * fx;
                    return (
                      <tr key={pc.code} className="border-b last:border-0">
                        <td className="px-3 py-2 text-xs font-medium text-muted-foreground">In {pc.code}</td>
                        <td className="px-3 py-2 font-mono">{pc.symbol}{fmt(cost, pc.code === "USD" ? 4 : 2)} / $1</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-primary/5">
                    <td className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary">Market rate (stored)</td>
                    <td className="px-3 py-2 font-mono font-semibold text-primary">${marketRateUsd.toFixed(4)} / $1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Section 4 — Customer Rate */}
          <Section n="4" title="Customer Rate" subtitle="Express the margin in the way that suits you.">
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border bg-secondary/40 p-1">
              <ModeTab active={custMode === "profit"} onClick={() => setCustMode("profit")} label="Profit Goal" icon={<Percent className="h-3 w-3" />} />
              <ModeTab active={custMode === "payout"} onClick={() => setCustMode("payout")} label="Target Payout" icon={<Wallet className="h-3 w-3" />} />
              <ModeTab active={custMode === "manual"} onClick={() => setCustMode("manual")} label="Manual" icon={<Target className="h-3 w-3" />} />
            </div>

            {custMode === "profit" && (
              <Field label="Target margin % *" hint="Customer gets market × (1 − margin / 100). Range 0–99%.">
                <div className="relative">
                  <Input type="number" step="0.1" value={marginPct} onChange={(e) => setMarginPct(e.target.value)} className="pr-8 font-mono" placeholder="8.3" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </Field>
            )}
            {custMode === "payout" && (
              <Field label="Desired NGN payout per $1 *" hint={`Must be less than acquisition cost ₦${fmt(acquisitionCostNgn, 0)} / $1.`}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">₦</span>
                  <Input type="number" value={targetNgn} onChange={(e) => setTargetNgn(e.target.value)} className="pl-7 font-mono" placeholder="1009" />
                </div>
              </Field>
            )}
            {custMode === "manual" && (
              <Field label="Customer rate (USD per $1) *" hint={`Must be < $${marketRateUsd.toFixed(4)} (market rate).`}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">$</span>
                  <Input type="number" step="0.001" value={manualUsd} onChange={(e) => setManualUsd(e.target.value)} className="pl-7 font-mono" placeholder="0.650" />
                </div>
              </Field>
            )}

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Source</span>
              <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* Section 5 — Summary */}
          <Section n="5" title="Summary" subtitle="Live preview of what will be saved and what the customer will receive.">
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4">
              <div className="grid grid-cols-3 gap-3 border-b pb-3">
                <SummaryStat label="Market rate" value={`$${marketRateUsd.toFixed(4)}`} sub="cost floor" />
                <SummaryStat label="Customer rate" value={`$${customerRateUsd.toFixed(4)}`} sub="per $1" highlight />
                <SummaryStat label="Margin" value={`${marginPctCalc.toFixed(2)}%`} sub={`$${marginAbs.toFixed(4)} / $1`} />
              </div>
              <p className="mt-3 mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" /> Customer receives for ${d.amount} card
              </p>
              <div className="space-y-1.5 font-mono text-xs">
                {payoutCurs.map((pc) => {
                  const fx = activeFxRate(pc.code, "USD") || (pc.code === "NGN" ? usdNgn : 0);
                  const payout = d.amount * customerRateUsd * fx;
                  const plut = d.amount * marginAbs * fx;
                  return (
                    <div key={pc.code} className="flex items-center justify-between rounded-md bg-card px-2.5 py-1.5">
                      <span className="text-muted-foreground">{d.amount} × ${customerRateUsd.toFixed(4)} × {pc.symbol}{fx.toFixed(2)}</span>
                      <span className="flex items-baseline gap-3">
                        <span className="text-[10px] text-muted-foreground">Plut +{pc.symbol}{fmt(plut, 0)}</span>
                        <span className="font-semibold text-foreground">{pc.symbol}{fmt(payout, 0)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-dashed bg-secondary/30 px-3 py-2 font-mono text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">Saves: </span>
              MarketRate ${marketRateUsd.toFixed(4)}/$1 · CustomerRate ${customerRateUsd.toFixed(4)}/$1
              {supplierMode === "NGN" && ` · SupplierQuote ₦${ngnInput || 0}/$1 (NGN mode — no acq. stored)`}
              {supplierMode === "CNY" && ` · AcquisitionCurrency CNY · SupplierRate ${cnyInput || 0} RMB/$1`}
              {supplierMode === "USD" && ` · direct USD — no acquisition currency stored`}
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card/95 px-6 py-3 backdrop-blur">
          <p className="text-xs text-muted-foreground">
            {valid ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" /> Ready to save</span> : <span className="flex items-center gap-1"><X className="h-3 w-3" /> Complete the form to save</span>}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={!valid}>{r ? "Update Rate" : "Save Rate"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ n, title, subtitle, children }: { n: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <header className="flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{n}</span>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">— {subtitle}</p>}
      </header>
      <div className="space-y-3 pl-7">{children}</div>
    </section>
  );
}

function ModeTab({ active, onClick, label, sub, icon }: { active: boolean; onClick: () => void; label: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-1">{icon}{label}</span>
      {sub && <span className="text-[9px] uppercase tracking-wider opacity-70">{sub}</span>}
    </button>
  );
}

function FxInline({ label, value, onChange, symbol, disabled }: { label: string; value: number; onChange: (n: number) => void; symbol: string; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <div className={cn("rounded-lg border bg-secondary/30 px-3 py-2", disabled && "opacity-50")}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {editing ? (
        <div className="mt-1 flex items-center gap-1">
          <span className="font-mono text-sm">{symbol}</span>
          <Input type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-7 font-mono text-sm" />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { const n = parseFloat(draft); if (n > 0) { onChange(n); setEditing(false); } }}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-0.5 flex items-center justify-between">
          <p className="font-mono text-base font-semibold">{symbol}{value.toLocaleString()}</p>
          {!disabled && (
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-mono text-base font-semibold", highlight && "text-primary")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function fmt(n: number, dec = 2) {
  if (!isFinite(n)) return "0";
  return n.toLocaleString("en-NG", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}