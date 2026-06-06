import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Check, X, Plus, Sparkles, AlertTriangle, Info, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  fxRateQueries, payoutCurrencyQueries, acquisitionCurrencyQueries,
  createRate, setFxRate,
  queryKeys,
  type BrandRateDetail,
} from "@/api";
import { cn } from "@/lib/utils";

export type DenomRateContext = {
  id: string;
  amount: number;
  currencyCode: string;
  cardType: string;
  brandName: string;
  countryCode: string;
  activeRate: BrandRateDetail | null;
};

type CustomerMode = "profit" | "payout" | "markup";


export function SetRateDialogBody({ denom, onClose }: { denom: DenomRateContext | null; onClose: () => void }) {
  const open = denom !== null;
  const qc = useQueryClient();

  const { data: fxRatesData } = useQuery({ ...fxRateQueries.current(), enabled: open });
  const { data: payoutsData } = useQuery({ ...payoutCurrencyQueries.list(), enabled: open });
  const { data: acqCursData } = useQuery({ ...acquisitionCurrencyQueries.list(), enabled: open });

  const allPayouts = (payoutsData ?? []).filter((p) => p.isActive);
  const acqCurs = acqCursData ?? [];

  const getFxFromApi = (base: string, quote: string) =>
    fxRatesData?.find((f) => f.baseCurrency === base && f.quoteCurrency === quote)?.rate ?? 0;

  // ── Local state ────────────────────────────────────────────────────────────

  const [acqCode, setAcqCode] = useState("USD");
  const [supplierInput, setSupplierInput] = useState("");
  const [fx, setFx] = useState<Record<string, number>>({});
  const fxKey = (base: string, quote: string) => `${base}_${quote}`;
  const getFx = (base: string, quote: string) => fx[fxKey(base, quote)] ?? getFxFromApi(base, quote);
  const setFxValue = (base: string, quote: string, v: number) => setFx((m) => ({ ...m, [fxKey(base, quote)]: v }));
  const usdNgn = getFx("USD", "NGN");

  const [custMode, setCustMode] = useState<CustomerMode>("markup");
  const [profitNgn, setProfitNgn] = useState("");
  const [targetNgn, setTargetNgn] = useState("");
  const [markupPct, setMarkupPct] = useState("");
  const [previewCodes, setPreviewCodes] = useState<string[]>(["NGN"]);

  useEffect(() => {
    if (!open || !fxRatesData) return;
    const next: Record<string, number> = {};
    next[fxKey("USD", "NGN")] = getFxFromApi("USD", "NGN");
    for (const ac of acqCurs) next[fxKey(ac.code, "NGN")] = getFxFromApi(ac.code, "NGN");
    for (const p of allPayouts) if (p.code !== "NGN") next[fxKey("USD", p.code)] = getFxFromApi("USD", p.code);
    setFx(next);

    const r = denom?.activeRate;
    if (r) {
      setAcqCode("USD");
      setSupplierInput(String(r.marketRateUsd));
      setCustMode("markup");
      setMarkupPct(String(r.markupValue));
    } else {
      setAcqCode("USD");
      setSupplierInput("");
      setCustMode("markup");
      setMarkupPct("8");
    }
    setProfitNgn(""); setTargetNgn("");
    setPreviewCodes(["NGN"]);
  }, [denom?.id, open, fxRatesData]); // eslint-disable-line react-hooks/exhaustive-deps

  const rateMutation = useMutation({
    mutationFn: async () => {
      if (!denom) return;
      // Persist edited FX rates first
      for (const [key, value] of Object.entries(fx)) {
        const [base, quote] = key.split("_");
        if (!base || !quote || !value) continue;
        const current = getFxFromApi(base, quote);
        if (current !== value) {
          await setFxRate({ baseCurrency: base, quoteCurrency: quote, rate: value, source: "Admin" });
        }
      }
      // Create the rate
      await createRate({
        denominationId: denom.id,
        marketRateUsd,
        acquisitionCurrency: acqCode !== "USD" ? acqCode : null,
        acquisitionRatePerCardDollar: acqCode !== "USD" ? supplierNum : null,
        markupType: "Percentage",
        markupValue: Number(marginPctCalc.toFixed(4)),
        source: "Admin",
      });
    },
    onSuccess: () => {
      toast.success("Rate saved.", {
        description: `Mkt $${marketRateUsd.toFixed(4)} · Cust $${customerRateUsd.toFixed(4)} · ${marginPctCalc.toFixed(1)}% margin`,
      });
      qc.invalidateQueries({ queryKey: queryKeys.fxRates.all() });
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
      qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
      qc.invalidateQueries({ queryKey: queryKeys.denominations.all() });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!denom) return null;

  // ── Derivations ────────────────────────────────────────────────────────────

  const supplierNum = parseFloat(supplierInput) || 0;
  let marketRateUsd = 0;
  let derivationLabel = "";
  if (acqCode === "USD") {
    marketRateUsd = supplierNum;
    derivationLabel = supplierNum
      ? `$${supplierNum.toFixed(4)} per card dollar (entered directly)`
      : "Enter the supplier quote in USD";
  } else {
    const acqNgn = getFx(acqCode, "NGN");
    const acqUsd = usdNgn ? acqNgn / usdNgn : 0;
    marketRateUsd = supplierNum * acqUsd;
    derivationLabel = supplierNum
      ? `${supplierNum} ${acqCode}/card$ × (${acqNgn.toLocaleString()} NGN/${acqCode} ÷ ${usdNgn.toLocaleString()} NGN/USD) = $${marketRateUsd.toFixed(4)} per card dollar`
      : `Enter the supplier quote in ${acqCode}`;
  }

  let customerRateUsd = 0;
  if (custMode === "profit") {
    customerRateUsd = marketRateUsd - (usdNgn ? (parseFloat(profitNgn) || 0) / usdNgn : 0);
  } else if (custMode === "payout") {
    customerRateUsd = usdNgn ? (parseFloat(targetNgn) || 0) / usdNgn : 0;
  } else {
    customerRateUsd = marketRateUsd * (1 - (parseFloat(markupPct) || 0) / 100);
  }
  customerRateUsd = Math.max(0, customerRateUsd);

  const marginUsd = Math.max(0, marketRateUsd - customerRateUsd);
  const marginPctCalc = marketRateUsd ? (marginUsd / marketRateUsd) * 100 : 0;
  const plutMarginNgnPerCard = marginUsd * denom.amount * usdNgn;
  const isLoss = marketRateUsd > 0 && customerRateUsd >= marketRateUsd;
  const lossUsd = isLoss ? customerRateUsd - marketRateUsd : 0;
  const lossNgnPerCard = lossUsd * denom.amount * usdNgn;
  const valid = marketRateUsd > 0 && customerRateUsd > 0 && customerRateUsd < marketRateUsd;

  const switchMode = (next: CustomerMode) => {
    if (next === custMode) return;
    if (marketRateUsd > 0 && customerRateUsd > 0) {
      if (next === "profit") setProfitNgn(((marketRateUsd - customerRateUsd) * usdNgn).toFixed(0));
      else if (next === "payout") setTargetNgn((customerRateUsd * usdNgn).toFixed(0));
      else setMarkupPct(((1 - customerRateUsd / marketRateUsd) * 100).toFixed(2));
    }
    setCustMode(next);
  };

  const switchAcqCurrency = (nextCode: string) => {
    if (nextCode === acqCode) return;
    const num = parseFloat(supplierInput);
    if (!num || marketRateUsd <= 0) { setAcqCode(nextCode); setSupplierInput(""); return; }
    let nextVal = 0;
    if (nextCode === "USD") {
      nextVal = marketRateUsd;
    } else {
      const nextAcqUsd = usdNgn ? getFx(nextCode, "NGN") / usdNgn : 0;
      nextVal = nextAcqUsd ? marketRateUsd / nextAcqUsd : 0;
    }
    setAcqCode(nextCode);
    setSupplierInput(nextVal > 0 ? nextVal.toFixed(nextCode === "USD" ? 4 : 2) : "");
  };

  const availableToAdd = allPayouts.filter((p) => !previewCodes.includes(p.code));
  const supplierSymbol = acqCode === "USD" ? "$" : (acqCurs.find((a) => a.code === acqCode)?.symbol ?? acqCode);

  return (
    <>
      <DialogHeader className="border-b px-5 py-3.5">
        <DialogTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {denom.activeRate ? "Update Rate" : "Set Rate"}
          <span className="text-muted-foreground">·</span>
          <span className="font-normal text-muted-foreground">
            {denom.brandName} / {denom.countryCode} / {denom.currencyCode} {denom.amount} {denom.cardType}
          </span>
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
                <Input type="number" step={acqCode === "USD" ? "0.001" : "0.01"} value={supplierInput}
                  onChange={(e) => setSupplierInput(e.target.value)} className="h-9 pl-7 font-mono text-sm"
                  placeholder={acqCode === "USD" ? "0.707" : "5.4"} />
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
                    {availableToAdd.length === 0
                      ? <p className="px-2 py-1.5 text-xs text-muted-foreground">All active currencies added</p>
                      : availableToAdd.map((p) => (
                          <button key={p.code} onClick={() => setPreviewCodes((arr) => [...arr, p.code])}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-secondary">
                            <span>{p.code} — {p.name}</span><span className="font-mono">{p.symbol}</span>
                          </button>
                        ))
                    }
                  </PopoverContent>
                </Popover>
              }
            >
              {previewCodes.map((code) => {
                const pc = allPayouts.find((p) => p.code === code);
                if (!pc) return null;
                return (
                  <FxInline key={code} label={`USD / ${code}`} base="USD" quote={code}
                    value={getFx("USD", code)} onChange={(v) => setFxValue("USD", code, v)}
                    symbol={pc.symbol} onRemove={code === "NGN" ? undefined : () => setPreviewCodes((arr) => arr.filter((c) => c !== code))} />
                );
              })}
            </FxGroup>

            {acqCode !== "USD" && (() => {
              const a = acqCurs.find((x) => x.code === acqCode);
              if (!a) return null;
              return (
                <FxGroup label={`Acquisition rates — ${a.code}`}>
                  <FxInline label={`${a.code} / NGN`} base={a.code} quote="NGN"
                    value={getFx(a.code, "NGN")} onChange={(v) => setFxValue(a.code, "NGN", v)} symbol="₦" />
                  <DerivedFx label={`${a.code} / USD (derived)`} value={usdNgn ? getFx(a.code, "NGN") / usdNgn : 0} symbol="$" />
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
                  {allPayouts.filter((p) => previewCodes.includes(p.code)).map((p) => {
                    const fxRate = getFx("USD", p.code);
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
                  <p className="text-[11px]">Loss ≈ ₦{fmt(lossNgnPerCard, 0)} per ${denom.amount} card.</p>
                </div>
              </div>
            )}
          </Section>

          {/* 5 — Payout Preview */}
          <Section title="Payout Preview" subtitle={`Customer receives for $${denom.amount} ${denom.cardType} card.`}>
            <div className="space-y-1.5">
              {previewCodes.map((code) => {
                const pc = allPayouts.find((p) => p.code === code);
                if (!pc) return null;
                const fxRate = getFx("USD", code);
                const payout = denom.amount * customerRateUsd * (fxRate || 0);
                return (
                  <div key={code} className="rounded-md border bg-card px-3 py-2 text-sm">
                    <p className="font-medium">Customer receives <span className="font-mono">{pc.symbol}{fmt(payout, 0)}</span></p>
                    <p className="text-[10px] text-muted-foreground">per ${denom.amount} card · FX {pc.symbol}{fmt(fxRate || 0, 2)}/$1</p>
                    {!fxRate && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-warning">
                        <AlertTriangle className="h-2.5 w-2.5" /> No FX rate — set it in the FX Rates tab
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* 6 — Summary */}
          <Section title="Summary">
            <div className={cn("rounded-xl border p-3", isLoss ? "border-destructive/40 bg-destructive/5" : "bg-linear-to-br from-primary/5 via-transparent to-transparent")}>
              <div className="grid grid-cols-3 gap-2 pb-2">
                <SummaryStat label="Market" value={`$${marketRateUsd.toFixed(4)}`} sub="cost floor" />
                <SummaryStat label="Customer" value={`$${customerRateUsd.toFixed(4)}`} sub="per $1" highlight={!isLoss} danger={isLoss} />
                <SummaryStat label={isLoss ? "Loss" : "Margin"} value={`${marginPctCalc.toFixed(2)}%`}
                  sub={isLoss ? `-$${lossUsd.toFixed(4)} / $1` : `$${marginUsd.toFixed(4)} / $1`} danger={isLoss} />
              </div>
              <div className="mt-1 flex items-center justify-between border-t pt-2.5 text-sm">
                <span className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest", isLoss ? "text-destructive" : "text-primary")}>
                  {isLoss ? <TrendingDown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {isLoss ? "Plut loss" : "Plut earns"}
                </span>
                <span className={cn("font-mono font-semibold", isLoss ? "text-destructive" : "text-primary")}>
                  {isLoss ? "-" : ""}₦{fmt(isLoss ? lossNgnPerCard : plutMarginNgnPerCard, 0)}
                  <span className="text-[11px] font-normal text-muted-foreground"> per ${denom.amount} card</span>
                </span>
              </div>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-card/95 px-5 py-3 backdrop-blur">
          <p className="text-xs text-muted-foreground">
            {isLoss ? (
              <span className="flex items-center gap-1 text-destructive font-medium"><AlertTriangle className="h-3 w-3" /> Loss-making rate</span>
            ) : valid ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" /> Ready to save</span>
            ) : (
              <span className="flex items-center gap-1"><X className="h-3 w-3" /> Complete the form to save</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => rateMutation.mutate()} disabled={!valid || rateMutation.isPending}>
              {rateMutation.isPending ? "Saving…" : denom.activeRate ? "Update Rate" : "Save Rate"}
            </Button>
          </div>
        </div>
    </>
  );
}

// ── Presentational helpers ─────────────────────────────────────────────────────

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
    <button type="button" onClick={onClick}
      className={cn("flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
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
        {onRemove && <button onClick={onRemove} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>}
      </div>
      {editing ? (
        <div className="mt-0.5 flex items-center gap-1">
          <span className="font-mono text-xs">{symbol}</span>
          <Input type="number" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-6 px-1.5 font-mono text-xs" />
          <Button size="icon" variant="ghost" className="h-6 w-6"
            onClick={() => { const n = parseFloat(draft); if (n > 0) { onChange(n); setEditing(false); } }}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="mt-0.5 flex items-center justify-between">
          <p className="font-mono text-sm font-semibold">{symbol}{value.toLocaleString()}</p>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
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
      <Input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)}
        className={cn("h-9 font-mono", prefix && "pl-7", suffix && "pr-8")} placeholder={placeholder} />
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
