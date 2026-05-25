import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Target, Wallet, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { denominations, brandById, countryById, activeRateForDenom, rateHistory, activeFxRate } from "@/data/mock";
import { formatNaira, currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = "profit" | "payout" | "markup";

export function SetRateDialog({ denomId, onClose }: { denomId: string | null; onClose: () => void }) {
  const open = denomId !== null;
  const d = useMemo(() => denominations.find((x) => x.id === denomId), [denomId]);
  const r = d ? activeRateForDenom(d.id) : null;
  const brand = d ? brandById(d.brandId) : null;
  const country = d ? countryById(d.countryId) : null;
  const fx = activeFxRate("NGN");

  const [mode, setMode] = useState<Mode>("markup");
  const [market, setMarket] = useState("");
  const [markupPct, setMarkupPct] = useState("");
  const [profitNgn, setProfitNgn] = useState("");
  const [payoutNgnIn, setPayoutNgnIn] = useState("");
  const [source, setSource] = useState<"Manual" | "Auto">("Manual");

  useEffect(() => {
    if (r) {
      setMarket(String(r.marketRateUsd));
      setMarkupPct(String(r.markupValue));
      setSource(r.source);
      setMode("markup");
    } else {
      setMarket(""); setMarkupPct(""); setProfitNgn(""); setPayoutNgnIn(""); setSource("Manual"); setMode("markup");
    }
  }, [denomId, r]);

  const mkt = parseFloat(market) || 0;

  // Derive customer rate from chosen mode
  let custRate = 0;
  if (mode === "markup") {
    const mk = parseFloat(markupPct) || 0;
    custRate = mkt * (1 - mk / 100);
  } else if (mode === "profit") {
    const target = parseFloat(profitNgn) || 0;
    const custNgn = mkt * fx - target;
    custRate = custNgn / fx;
  } else {
    const payout = parseFloat(payoutNgnIn) || 0;
    custRate = payout / fx;
  }
  custRate = Math.max(0, custRate);

  const spread = Math.max(0, mkt - custRate);
  const markupPctCalc = mkt ? (spread / mkt) * 100 : 0;
  const cardCustNgn = d ? Math.round(d.amount * custRate * fx) : 0;
  const cardPlutNgn = d ? Math.round(d.amount * spread * fx) : 0;

  const submit = async () => {
    if (!mkt) { toast.error("Market rate required"); return; }
    if (custRate <= 0) { toast.error("Customer rate must be positive"); return; }
    await new Promise((res) => setTimeout(res, 400));
    toast.success("Rate updated.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{r ? "Update Rate" : "Set Rate"}</DialogTitle>
          <DialogDescription>
            {brand?.logoEmoji} {brand?.name} · {country?.flag} {country?.name} · {currencySymbol(d?.currency ?? "USD")}{d?.amount} {d?.cardType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Market Rate (USD per $1 card value) *" hint="What Plut effectively pays per $1 of face value.">
            <Input type="number" step="0.01" value={market} onChange={(e) => setMarket(e.target.value)} className="font-mono" placeholder="0.82" />
          </Field>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">How do you want to set the rate?</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border bg-secondary/40 p-1">
              <ModeTab active={mode === "profit"} onClick={() => setMode("profit")} icon={<Target className="h-3.5 w-3.5" />} label="Profit Target" />
              <ModeTab active={mode === "payout"} onClick={() => setMode("payout")} icon={<Wallet className="h-3.5 w-3.5" />} label="Payout Target" />
              <ModeTab active={mode === "markup"} onClick={() => setMode("markup")} icon={<Percent className="h-3.5 w-3.5" />} label="Markup %" />
            </div>
          </div>

          {mode === "profit" && (
            <Field label="₦ profit per $1 of card value *" hint={`FX: ₦${fx.toLocaleString()} / $1 (live)`}>
              <Input type="number" value={profitNgn} onChange={(e) => setProfitNgn(e.target.value)} className="font-mono" placeholder="400" />
            </Field>
          )}
          {mode === "payout" && (
            <Field label="₦ payout customer receives per $1 *" hint={`FX: ₦${fx.toLocaleString()} / $1 (live)`}>
              <Input type="number" value={payoutNgnIn} onChange={(e) => setPayoutNgnIn(e.target.value)} className="font-mono" placeholder="1271" />
            </Field>
          )}
          {mode === "markup" && (
            <Field label="Markup % *" hint="Customer earns market rate × (1 − markup %).">
              <Input type="number" step="0.1" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} className="font-mono" placeholder="1.2" />
            </Field>
          )}

          <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">Live Preview</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
              <Stat k="Customer rate" v={`$${custRate.toFixed(4)} / $1`} />
              <Stat k="Markup" v={`${markupPctCalc.toFixed(2)}% ($${spread.toFixed(4)})`} />
              {d && (
                <>
                  <Stat k={`Customer earns on $${d.amount}`} v={formatNaira(cardCustNgn)} accent />
                  <Stat k="Plut earns" v={formatNaira(cardPlutNgn)} accent />
                </>
              )}
            </div>
          </div>

          <Field label="Source">
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="Auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {d && rateHistory.filter((h) => h.denominationId === d.id).length > 0 && (
            <div className="rounded-lg border p-3 text-xs">
              <p className="mb-2 font-semibold">Rate history</p>
              <ul className="space-y-1 text-muted-foreground">
                {rateHistory.filter((h) => h.denominationId === d.id).map((h) => (
                  <li key={h.id} className="font-mono">${h.marketRateUsd} → ${h.customerRateUsd} ({h.markupValue}%) · {h.validFrom}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{r ? "Update Rate" : "Set Rate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon} {label}
    </button>
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

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className={cn("font-mono", accent && "text-sm font-semibold text-primary")}>{v}</span>
    </div>
  );
}