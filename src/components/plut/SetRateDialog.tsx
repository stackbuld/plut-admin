import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { denominations, brandById, countryById, activeRateForDenom, rateHistory } from "@/data/mock";
import { formatNaira } from "@/lib/format";

const FX = 1550;

export function SetRateDialog({ denomId, onClose }: { denomId: string | null; onClose: () => void }) {
  const open = denomId !== null;
  const d = useMemo(() => denominations.find((x) => x.id === denomId), [denomId]);
  const r = d ? activeRateForDenom(d.id) : null;
  const brand = d ? brandById(d.brandId) : null;
  const country = d ? countryById(d.countryId) : null;

  const [market, setMarket] = useState("");
  const [markup, setMarkup] = useState("");
  const [type, setType] = useState<"Percentage" | "Fixed">("Percentage");
  const [source, setSource] = useState<"Manual" | "Auto">("Manual");

  useEffect(() => {
    if (r) { setMarket(String(r.marketRateUsd)); setMarkup(String(r.markupValue)); setType(r.markupType); setSource(r.source); }
    else { setMarket(""); setMarkup(""); setType("Percentage"); setSource("Manual"); }
  }, [denomId, r]);

  const mkt = parseFloat(market) || 0;
  const mk = parseFloat(markup) || 0;
  const cust = type === "Percentage" ? mkt * (1 - mk / 100) : Math.max(0, mkt - mk);
  const spread = mkt - cust;
  const payoutNgn = d ? Math.round(d.amount * cust * FX) : 0;

  const submit = async () => {
    if (!mkt) { toast.error("Market rate required"); return; }
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Rate updated.");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{r ? "Update Rate" : "Set Rate"}</DialogTitle>
          <DialogDescription>
            {brand?.name} · {country?.name} · ${d?.amount} {d?.cardType}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Market Rate (USD per $1 card value) *" hint="What Plut pays per $1 of card value.">
            <Input type="number" step="0.01" value={market} onChange={(e) => setMarket(e.target.value)} className="font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Markup type *">
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Percentage">Percentage</SelectItem><SelectItem value="Fixed">Fixed amount</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label={`Markup value * ${type === "Percentage" ? "(%)" : "(USD)"}`}>
              <Input type="number" step="0.1" value={markup} onChange={(e) => setMarkup(e.target.value)} className="font-mono" />
            </Field>
          </div>
          <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Live Preview</p>
            <div className="space-y-1 font-mono text-xs">
              <Row k="Customer rate"><span>${cust.toFixed(4)} / $1 face</span></Row>
              <Row k="Markup spread"><span>${spread.toFixed(4)} / $1</span></Row>
              {d && <Row k={`On $${d.amount} card`}><span>≈ {formatNaira(payoutNgn)} @ ₦{FX}/$</span></Row>}
            </div>
          </div>
          <Field label="Source">
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Manual">Manual</SelectItem><SelectItem value="Auto">Auto</SelectItem></SelectContent>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span>{children}</div>;
}