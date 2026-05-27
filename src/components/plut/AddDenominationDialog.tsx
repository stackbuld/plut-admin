import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brands, brandById, countries, countryById } from "@/data/mock";
import { useCatalogStore, type RatePayload } from "@/data/store";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AddDenominationDialog({
  open,
  brandId,
  countryId,
  lockBrand,
  lockCountry,
  onClose,
  onCreated,
}: {
  open: boolean;
  brandId?: string;
  countryId?: string;
  lockBrand?: boolean;
  lockCountry?: boolean;
  onClose: () => void;
  onCreated?: (info: { brandId: string; countryId: string; face: string; type: "Physical" | "E-code"; hasRate: boolean }) => void;
}) {
  const addDenominationAction = useCatalogStore((s) => s.addDenomination);
  const [bId, setBId] = useState(brandId ?? "");
  const [cId, setCId] = useState(countryId ?? "");
  const [face, setFace] = useState("");
  const [type, setType] = useState<"Physical" | "E-code">("Physical");
  const [setInitial, setSetInitial] = useState(false);
  const [market, setMarket] = useState("");
  const [markup, setMarkup] = useState("1.2");

  useEffect(() => {
    if (open) {
      setBId(brandId ?? "");
      setCId(countryId ?? "");
      setFace(""); setType("Physical"); setSetInitial(false); setMarket(""); setMarkup("1.2");
    }
  }, [open, brandId, countryId]);

  const brand = brandById(bId);
  const country = cId ? countryById(cId) : null;
  const sym = currencySymbol(country?.currency ?? "USD");

  const submit = () => {
    if (!bId) { toast.error("Brand required"); return; }
    if (!cId) { toast.error("Country required"); return; }
    if (!face) { toast.error("Face value required"); return; }
    if (setInitial && !parseFloat(market)) { toast.error("Market rate required for initial rate"); return; }
    const faceNum = parseFloat(face);
    const marketNum = setInitial ? parseFloat(market) : 0;
    const markupNum = setInitial ? parseFloat(markup) || 0 : 0;
    let initialRate: RatePayload | null = null;
    if (setInitial && marketNum > 0) {
      const cust = +(marketNum * (1 - markupNum / 100)).toFixed(4);
      initialRate = {
        marketRateUsd: marketNum,
        customerRateUsd: cust,
        markupType: "Percentage",
        markupValue: markupNum,
        source: "Manual",
      };
    }
    addDenominationAction({
      brandId: bId,
      countryId: cId,
      amount: faceNum,
      currency: country?.currency ?? "USD",
      cardType: type,
      initialRate,
    });
    toast.success(`Added ${sym}${face} ${type} for ${brand?.name} · ${country?.name}${setInitial ? " (with rate)" : ""}.`);
    onCreated?.({ brandId: bId, countryId: cId, face, type, hasRate: setInitial });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Denomination</DialogTitle>
          <DialogDescription>
            {lockBrand && brand && lockCountry && country
              ? `${brand.name} · ${country.name} (${country.code} · ${country.currency})`
              : "Register a new card denomination."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Brand *">
            {lockBrand ? (
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">{brand?.logoEmoji} {brand?.name} <span className="text-muted-foreground font-mono text-xs">({brand?.code})</span></div>
            ) : (
              <Select value={bId} onValueChange={setBId}>
                <SelectTrigger><SelectValue placeholder="Choose brand" /></SelectTrigger>
                <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.logoEmoji} {b.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Country *">
            {lockCountry ? (
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">{country?.flag} {country?.name} <span className="text-muted-foreground font-mono text-xs">({country?.code} · {country?.currency})</span></div>
            ) : (
              <Select value={cId} onValueChange={setCId}>
                <SelectTrigger><SelectValue placeholder="Choose country" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.flag} {c.name} ({c.code})</SelectItem>)}</SelectContent>
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Face value *" hint="Common: 10, 25, 50, 100, 200, 500">
              <Input type="number" value={face} onChange={(e) => setFace(e.target.value)} placeholder="100" className="font-mono" />
            </Field>
            <Field label="Currency">
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm font-mono">{country?.currency ?? "—"}</div>
            </Field>
          </div>

          <Field label="Card type *">
            <div className="grid grid-cols-2 gap-2">
              {(["Physical", "E-code"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    type === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary",
                  )}
                >{t}</button>
              ))}
            </div>
          </Field>

          <div className="space-y-2 rounded-lg border bg-secondary/30 p-3">
            <label className="flex items-center justify-between text-sm font-medium">
              <span>Set initial rate?</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setSetInitial(false)} className={cn("rounded px-2.5 py-1 text-xs font-medium", !setInitial ? "bg-card shadow-sm" : "text-muted-foreground")}>Skip</button>
                <button type="button" onClick={() => setSetInitial(true)} className={cn("rounded px-2.5 py-1 text-xs font-medium", setInitial ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Set now</button>
              </div>
            </label>
            {setInitial && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Field label="Market rate USD/$1 *">
                  <Input type="number" step="0.01" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="0.82" className="font-mono" />
                </Field>
                <Field label="Markup %">
                  <Input type="number" step="0.1" value={markup} onChange={(e) => setMarkup(e.target.value)} className="font-mono" />
                </Field>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Add Denomination</Button>
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