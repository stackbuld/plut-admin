import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, Check, X, Plus, Sparkles, AlertTriangle, Info, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  denominations,
  brandById,
  countryById,
  activeRateForDenom,
  activeFxRate,
  activePayoutCurrencies,
  acquisitionCurrencies,
} from "@/data/mock";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

type CustomerMode = "profit" | "payout" | "markup";

export function SetRateDialog({ denomId, onClose }: { denomId: string | null; onClose: () => void }) {
  const open = denomId !== null;
  const d = useMemo(() => denominations.find((x) => x.id === denomId), [denomId]);
  const r = d ? activeRateForDenom(d.id) : null;
  const brand = d ? brandById(d.brandId) : null;
  const country = d ? countryById(d.countryId) : null;

  const allPayouts = activePayoutCurrencies();
  const acqCurs = acquisitionCurrencies(); // e.g. [{ code: "CNY", symbol: "¥", ... }]

  // --- Section 1: Acquisition currency dropdown ("USD" = direct) -------------
  // Selected acquisition code; "USD" means "no acquisition currency / direct".
  const [acqCode, setAcqCode] = useState<string>("USD");
  const [supplierInput, setSupplierInput] = useState<string>("");

  // --- Section 2: Live FX rates (all editable; map<pair, value>) -------------
  // Pairs keyed as `${base}_${quote}`. Loaded from active FX rates on open.
  const [fx, setFx] = useState<Record<string, number>>({});
  const fxKey = (base: string, quote: string) => `${base}_${quote}`;
  const getFx = (base: string, quote: string) =>
    fx[fxKey(base, quote)] ?? activeFxRate(quote, base);
  const setFxValue = (base: string, quote: string, v: number) =>
    setFx((m) => ({ ...m, [fxKey(base, quote)]: v }));

  const usdNgn = getFx("USD", "NGN");

  // --- Section 4: customer rate inputs --------------------------------------
  const [custMode, setCustMode] = useState<CustomerMode>("markup");
  const [profitNgn, setProfitNgn] = useState<string>("");   // ₦ per $1 face value
  const [targetNgn, setTargetNgn] = useState<string>("");   // ₦ payout per $1
  const [markupPct, setMarkupPct] = useState<string>("");   // % off market

  // --- Section 5: payout preview currencies (selected codes) ----------------
  const [previewCodes, setPreviewCodes] = useState<string[]>(["NGN"]);

  useEffect(() => {
    if (!open) return;
    // Seed FX map from current actives
    const next: Record<string, number> = {};
    next[fxKey("USD", "NGN")] = activeFxRate("NGN", "USD");
    for (const ac of acqCurs) next[fxKey(ac.code, "NGN")] = activeFxRate("NGN", ac.code);
    for (const p of allPayouts) if (p.code !== "NGN") next[fxKey("USD", p.code)] = activeFxRate(p.code, "USD");
    setFx(next);

    // Seed inputs from existing rate
    if (r) {
      if (r.acquisitionCurrency === "CNY" && r.acquisitionRatePerCardDollar) {
        setAcqCode("CNY");
        setSupplierInput(String(r.acquisitionRatePerCardDollar));
      } else if (r.supplierNgnPerDollar) {
        // Legacy NGN mode — promote to USD direct (NGN isn't an acquisition currency)
        setAcqCode("USD");
        setSupplierInput(r.marketRateUsd.toFixed(4));
      } else {
        setAcqCode("USD");
        setSupplierInput(String(r.marketRateUsd));
      }
      setCustMode("markup");
      setMarkupPct(String(r.markupValue));
      setProfitNgn(""); setTargetNgn("");
    } else {
      setAcqCode("USD");
      setSupplierInput("");
      setCustMode("markup"); setMarkupPct("8"); setProfitNgn(""); setTargetNgn("");
    }
    setPreviewCodes(["NGN"]);
  }, [denomId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return null;

  // --- Derivations ----------------------------------------------------------
  const supplierNum = parseFloat(supplierInput) || 0;
  // Derive market rate (USD per $1 face value) from supplier quote
  let marketRateUsd = 0;
  let derivationLabel = "";
  if (acqCode === "USD") {
    marketRateUsd = supplierNum;
    derivationLabel = supplierNum
      ? `$${supplierNum.toFixed(4)} per card dollar (entered directly)`
      : "Enter the supplier quote in USD";
  } else {
    const acqNgn = getFx(acqCode, "NGN");
    const acqUsd = usdNgn ? acqNgn / usdNgn : 0; // e.g. CNY → USD
    marketRateUsd = supplierNum * acqUsd;
    derivationLabel = supplierNum
      ? `${supplierNum} ${acqCode}/card$ × (${acqNgn.toLocaleString()} NGN/${acqCode} ÷ ${usdNgn.toLocaleString()} NGN/USD) = $${marketRateUsd.toFixed(4)} per card dollar`
      : `Enter the supplier quote in ${acqCode}`;
  }

  // Customer rate (USD per $1 face value) per chosen mode
  let customerRateUsd = 0;
  if (custMode === "profit") {
    const ngn = parseFloat(profitNgn) || 0;
    const profitUsd = usdNgn ? ngn / usdNgn : 0;
    customerRateUsd = marketRateUsd - profitUsd;
  } else if (custMode === "payout") {
    const ngn = parseFloat(targetNgn) || 0;
    customerRateUsd = usdNgn ? ngn / usdNgn : 0;
  } else {
    const pct = parseFloat(markupPct) || 0;
    customerRateUsd = marketRateUsd * (1 - pct / 100);
  }
  customerRateUsd = Math.max(0, customerRateUsd);

  const marginUsd = Math.max(0, marketRateUsd - customerRateUsd);
  const marginPctCalc = marketRateUsd ? (marginUsd / marketRateUsd) * 100 : 0;
  const plutMarginNgnPerCard = marginUsd * d.amount * usdNgn;
  // Loss detection — customer rate at or above market means Plut loses money.
  const isLoss = marketRateUsd > 0 && customerRateUsd >= marketRateUsd;
  const lossUsd = isLoss ? customerRateUsd - marketRateUsd : 0;
  const lossNgnPerCard = lossUsd * d.amount * usdNgn;
  const valid = marketRateUsd > 0 && customerRateUsd > 0 && customerRateUsd < marketRateUsd;

  // Switch tabs while preserving the equivalent value (derived from current customerRateUsd).
  const switchMode = (next: CustomerMode) => {
    if (next === custMode) return;
    if (marketRateUsd > 0 && customerRateUsd > 0) {
      if (next === "profit") {
        const ngn = (marketRateUsd - customerRateUsd) * usdNgn;
        setProfitNgn(ngn > 0 ? ngn.toFixed(0) : "");
      } else if (next === "payout") {
        const ngn = customerRateUsd * usdNgn;
        setTargetNgn(ngn > 0 ? ngn.toFixed(0) : "");
      } else {
        const pct = (1 - customerRateUsd / marketRateUsd) * 100;
        setMarkupPct(pct >= 0 ? pct.toFixed(2) : "");
      }
    }
    setCustMode(next);
  };

  // Convert supplier quote to equivalent in a different acquisition currency,
  // preserving the implied market rate (USD per $1 face value).
  const switchAcqCurrency = (nextCode: string) => {
    if (nextCode === acqCode) return;
    const num = parseFloat(supplierInput);
    if (!num || marketRateUsd <= 0) {
      setAcqCode(nextCode);
      setSupplierInput("");
      return;
    }
    let nextVal = 0;
    if (nextCode === "USD") {
      nextVal = marketRateUsd; // USD/card$
    } else {
      const nextNgn = getFx(nextCode, "NGN");
      const nextAcqUsd = usdNgn ? nextNgn / usdNgn : 0; // USD per 1 unit of nextCode
      nextVal = nextAcqUsd ? marketRateUsd / nextAcqUsd : 0;
    }
    setAcqCode(nextCode);
    setSupplierInput(nextVal > 0 ? nextVal.toFixed(nextCode === "USD" ? 4 : 2) : "");
  };

  const submit = async () => {
    if (!marketRateUsd) { toast.error("Enter the supplier quote"); return; }
    if (customerRateUsd <= 0) { toast.error("Customer rate must be positive"); return; }
    if (customerRateUsd >= marketRateUsd) { toast.error("Customer rate must be below market rate — would cause a loss"); return; }
    await new Promise((res) => setTimeout(res, 300));
    toast.success("Rate saved.", {
      description: `Mkt $${marketRateUsd.toFixed(4)} · Cust $${customerRateUsd.toFixed(4)} · ${marginPctCalc.toFixed(1)}% margin`,
    });
    onClose();
  };

  // Available payout currencies for the "+ Add currency" picker
  const availableToAdd = allPayouts.filter((p) => !previewCodes.includes(p.code));
  const supplierSymbol = acqCode === "USD" ? "$" : (acqCurs.find((a) => a.code === acqCode)?.symbol ?? acqCode);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 py-3.5">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {r ? "Update Rate" : "Set Rate"}
            <span className="text-muted-foreground">·</span>
            <span className="font-normal text-muted-foreground">{brand?.logoEmoji} {brand?.name} / {country?.code} / {currencySymbol(d.currency)}{d.amount} {d.cardType}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">Enter the supplier quote — we derive market rate, payouts and Plut margin.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-4">
          {/* 1 — Supplier Quote */}
          <Section title="Supplier Quote">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <Select value={acqCode} onValueChange={switchAcqCurrency}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — direct</SelectItem>
                  {acqCurs.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-foreground/70">{supplierSymbol}</span>
                <Input
                  type="number"
                  step={acqCode === "USD" ? "0.001" : "0.01"}
                  value={supplierInput}
                  onChange={(e) => setSupplierInput(e.target.value)}
                  className="h-9 pl-7 font-mono text-sm"
                  placeholder={acqCode === "USD" ? "0.707" : acqCode === "CNY" ? "5.4" : "0"}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Supplier quote per $1 face value ({acqCode})
              {acqCode !== "USD" && supplierNum > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 font-mono italic text-foreground">
                  ≈ ${marketRateUsd.toFixed(4)} per card dollar
                </span>
              )}
            </p>
          </Section>

          {/* 2 — Live FX Rates */}
          <Section title="Live FX Rates" subtitle="Edit inline if the market has moved.">
            <FxGroup
              label="Payout rates"
              right={
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px]" disabled={availableToAdd.length === 0}>
                      <Plus className="h-3 w-3" /> Add currency
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1">
                    {availableToAdd.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">All active currencies added</p>
                    ) : availableToAdd.map((p) => (
                      <button
                        key={p.code}
                        onClick={() => setPreviewCodes((arr) => [...arr, p.code])}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-secondary"
                      >
                        <span>{p.code} — {p.name}</span><span className="font-mono">{p.symbol}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              }
            >
              {previewCodes.map((code) => {
                const pc = allPayouts.find((p) => p.code === code);
                if (!pc) return null;
                const isNgn = code === "NGN";
                return (
                  <FxInline
                    key={code}
                    label={`USD / ${code}`}
                    base="USD" quote={code}
                    value={isNgn ? getFx("USD", "NGN") : getFx("USD", code)}
                    onChange={(v) => setFxValue("USD", code, v)}
                    symbol={pc.symbol}
                    onRemove={isNgn ? undefined : () => setPreviewCodes((arr) => arr.filter((c) => c !== code))}
                  />
                );
              })}
            </FxGroup>

            {acqCode !== "USD" && (() => {
              const a = acqCurs.find((x) => x.code === acqCode);
              if (!a) return null;
              const derived = usdNgn ? getFx(a.code, "NGN") / usdNgn : 0;
              return (
                <FxGroup label={`Acquisition rates — ${a.code}`}>
                  <FxInline
                    label={`${a.code} / NGN`}
                    base={a.code} quote="NGN"
                    value={getFx(a.code, "NGN")}
                    onChange={(v) => setFxValue(a.code, "NGN", v)}
                    symbol="₦"
                  />
                  <DerivedFx
                    label={`${a.code} / USD (derived)`}
                    value={derived}
                    symbol="$"
                  />
                </FxGroup>
              );
            })()}
          </Section>

          {/* 3 — Acquisition Cost */}
          <Section title="Acquisition cost per $1 face value">
            <div className="rounded-lg border bg-secondary/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Market rate (stored)</span>
                <span className="font-mono text-base font-semibold text-primary">${marketRateUsd.toFixed(4)} / $1</span>
              </div>
              {marketRateUsd > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
                  {allPayouts.map((p) => {
                    const fxRate = p.code === "NGN" ? usdNgn : getFx("USD", p.code);
                    if (!fxRate) return null;
                    return (
                      <span key={p.code} className="inline-flex items-center gap-1 rounded bg-card px-2 py-0.5 font-mono text-xs">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{p.code}</span>
                        <span className="font-semibold">{p.symbol}{fmt(marketRateUsd * fxRate, 2)}</span>
                        <span className="text-[10px] text-muted-foreground">/ $1</span>
                      </span>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 flex items-start gap-1.5 border-t pt-2 font-mono text-xs italic text-muted-foreground">
                <Info className="mt-px h-3 w-3 shrink-0" />
                <span>{derivationLabel}</span>
              </p>
            </div>
          </Section>

          {/* 4 — Customer Rate */}
          <Section title="Customer Rate" subtitle="Express the margin in the way that suits you.">
            <div className="grid grid-cols-3 gap-1 rounded-lg border bg-secondary/40 p-1">
              <ModeTab active={custMode === "profit"} onClick={() => switchMode("profit")} label="Profit Goal" sub="₦ profit / $1" />
              <ModeTab active={custMode === "payout"} onClick={() => switchMode("payout")} label="Target Payout" sub="₦ payout / $1" />
              <ModeTab active={custMode === "markup"} onClick={() => switchMode("markup")} label="Markup %" sub="% of market" />
            </div>

            {custMode === "profit" && (
              <Field label="₦ profit Plut earns per $1 of face value *" hint={`Subtracted from market rate. Acquisition ≈ ₦${fmt(marketRateUsd * usdNgn, 0)} / $1.`}>
                <NumberInput value={profitNgn} onChange={setProfitNgn} prefix="₦" placeholder="80" />
              </Field>
            )}
            {custMode === "payout" && (
              <Field label="₦ the customer receives per $1 of face value *" hint={`Must be less than acquisition ₦${fmt(marketRateUsd * usdNgn, 0)} / $1.`}>
                <NumberInput value={targetNgn} onChange={setTargetNgn} prefix="₦" placeholder="1009" />
              </Field>
            )}
            {custMode === "markup" && (
              <Field label="Markup % on acquisition cost *" hint="Customer rate = market × (1 − markup / 100).">
                <NumberInput value={markupPct} onChange={setMarkupPct} suffix="%" step="0.1" placeholder="8.3" />
              </Field>
            )}

            <div className={cn(
              "flex items-center justify-between rounded-md px-3 py-1.5 font-mono text-xs",
              isLoss ? "bg-destructive/10 border border-destructive/30" : "bg-secondary/40",
            )}>
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider", isLoss ? "text-destructive" : "text-muted-foreground")}>Customer rate (USD)</span>
              <span className={cn("italic", isLoss && "text-destructive font-semibold")}>${customerRateUsd.toFixed(4)} / $1</span>
            </div>
            {isLoss && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">This rate would cause a loss</p>
                  <p className="text-[11px]">Customer rate (${customerRateUsd.toFixed(4)}) is above acquisition (${marketRateUsd.toFixed(4)}). Loss ≈ ₦{fmt(lossNgnPerCard, 0)} per ${d.amount} card.</p>
                </div>
              </div>
            )}
          </Section>

          {/* 5 — Payout Preview */}
          <Section
            title="Payout Preview"
            subtitle={`Customer receives for $${d.amount} ${d.cardType} card.`}
          >
            <div className="space-y-1.5">
              {previewCodes.map((code) => {
                const pc = allPayouts.find((p) => p.code === code);
                if (!pc) return null;
                const fxRate = code === "NGN" ? usdNgn : getFx("USD", code);
                const missing = !fxRate;
                const payout = d.amount * customerRateUsd * (fxRate || 0);
                return (
                  <div key={code} className="rounded-md border bg-card px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">Customer receives <span className="font-mono">{pc.symbol}{fmt(payout, 0)}</span></p>
                      <p className="text-[10px] text-muted-foreground">per ${d.amount} card · FX {pc.symbol}{fmt(fxRate || 0, 2)}/$1</p>
                      {missing && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-warning">
                          <AlertTriangle className="h-2.5 w-2.5" /> No FX rate set for {code} — set it in the FX Rates tab
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {previewCodes.length === 0 && (
                <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">No currencies — add one in Live FX Rates to preview the payout.</p>
              )}
            </div>
          </Section>

          {/* 6 — Summary */}
          <Section title="Summary">
            <div className={cn(
              "rounded-xl border p-3",
              isLoss ? "border-destructive/40 bg-destructive/5" : "bg-gradient-to-br from-primary/5 via-transparent to-transparent",
            )}>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <SummaryStat label="Market" value={`$${marketRateUsd.toFixed(4)}`} sub="cost floor" />
                <SummaryStat label="Customer" value={`$${customerRateUsd.toFixed(4)}`} sub="per $1" highlight={!isLoss} danger={isLoss} />
                <SummaryStat
                  label={isLoss ? "Loss" : "Margin"}
                  value={isLoss ? `-${marginPctCalc ? "" : ""}${((customerRateUsd / marketRateUsd - 1) * 100).toFixed(2)}%` : `${marginPctCalc.toFixed(2)}%`}
                  sub={isLoss ? `-$${lossUsd.toFixed(4)} / $1` : `$${marginUsd.toFixed(4)} / $1`}
                  danger={isLoss}
                />
              </div>
              <div className={cn(
                "mt-2.5 flex items-center justify-between rounded-md px-3 py-2 text-sm",
                isLoss ? "bg-destructive/15" : "bg-primary/10",
              )}>
                <span className={cn(
                  "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest",
                  isLoss ? "text-destructive" : "text-primary",
                )}>
                  {isLoss ? <TrendingDown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {isLoss ? "Plut loss" : "Plut margin"}
                </span>
                <span className={cn("font-mono font-semibold", isLoss ? "text-destructive" : "text-primary")}>
                  {isLoss ? "-" : ""}₦{fmt(isLoss ? lossNgnPerCard : plutMarginNgnPerCard, 0)} <span className="text-[11px] font-normal text-muted-foreground">per ${d.amount} card</span>
                </span>
              </div>
            </div>
            <p className="rounded-md border border-dashed bg-secondary/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Saves: </span>
              MarketRate ${marketRateUsd.toFixed(4)}/$1 · CustomerRate ${customerRateUsd.toFixed(4)}/$1
              {acqCode !== "USD" && ` · AcquisitionCurrency ${acqCode} · SupplierRate ${supplierInput || 0} ${acqCode}/$1`}
              {acqCode === "USD" && ` · direct USD (no acquisition currency)`}
            </p>
          </Section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card/95 px-5 py-3 backdrop-blur">
          <p className="text-xs text-muted-foreground">
            {isLoss ? (
              <span className="flex items-center gap-1 text-destructive font-medium"><AlertTriangle className="h-3 w-3" /> Loss-making rate — adjust to save</span>
            ) : valid ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" /> Ready to save</span>
            ) : (
              <span className="flex items-center gap-1"><X className="h-3 w-3" /> Complete the form to save</span>
            )}
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

// --- Small presentational helpers ------------------------------------------

function Section({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function FxGroup({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</p>
        {right}
      </div>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function ModeTab({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{label}</span>
      {sub && <span className="text-[10px] uppercase tracking-wider opacity-80">{sub}</span>}
    </button>
  );
}

function FxInline({ label, value, onChange, symbol, onRemove }: { label: string; base: string; quote: string; value: number; onChange: (n: number) => void; symbol: string; onRemove?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <div className="rounded-md border bg-secondary/30 px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</p>
        {onRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${label}`}>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-0.5 flex items-center gap-1">
          <span className="font-mono text-xs">{symbol}</span>
          <Input type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-6 px-1.5 font-mono text-xs" />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { const n = parseFloat(draft); if (n > 0) { onChange(n); setEditing(false); } }}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="mt-0.5 flex items-center justify-between">
          <p className="font-mono text-sm font-semibold">{symbol}{value.toLocaleString()}</p>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground" aria-label={`Edit ${label}`}>
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function DerivedFx({ label, value, symbol }: { label: string; value: number; symbol: string }) {
  return (
    <div className="rounded-md border border-dashed bg-secondary/20 px-2.5 py-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</p>
      <p className="mt-0.5 font-mono text-sm italic text-muted-foreground">{symbol}{value ? value.toFixed(4) : "—"}</p>
    </div>
  );
}

function NumberInput({ value, onChange, prefix, suffix, placeholder, step = "0.01" }: { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string; step?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">{prefix}</span>}
      <Input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={cn("h-9 font-mono", prefix && "pl-7", suffix && "pr-8")} placeholder={placeholder} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function SummaryStat({ label, value, sub, highlight, danger }: { label: string; value: string; sub?: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div>
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", danger ? "text-destructive" : "text-muted-foreground")}>{label}</p>
      <p className={cn("font-mono text-sm font-semibold", highlight && "text-primary", danger && "text-destructive")}>{value}</p>
      {sub && <p className={cn("text-[11px]", danger ? "text-destructive/80" : "text-muted-foreground")}>{sub}</p>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function fmt(n: number, dec = 2) {
  if (!isFinite(n)) return "0";
  return n.toLocaleString("en-NG", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}