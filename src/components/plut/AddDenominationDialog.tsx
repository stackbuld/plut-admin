import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brandQueries, countryQueries, createDenomination, createRate, queryKeys, type CardType } from "@/api";
import { cn } from "@/lib/utils";

export function AddDenominationDialog({
  open,
  brandId,
  countryId,
  lockBrand,
  lockCountry,
  brandName,
  countryName,
  countryCode,
  currencyCode,
  onClose,
}: {
  open: boolean;
  brandId?: string;
  countryId?: string;
  lockBrand?: boolean;
  lockCountry?: boolean;
  brandName?: string;
  countryName?: string;
  countryCode?: string;
  currencyCode?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Only fetch lists when dropdowns are needed
  const { data: brands } = useQuery({ ...brandQueries.list(), enabled: open && !lockBrand });
  const { data: countries } = useQuery({ ...countryQueries.list(), enabled: open && !lockCountry });

  const [bId, setBId] = useState(brandId ?? "");
  const [cId, setCId] = useState(countryId ?? "");
  const [face, setFace] = useState("");
  const [cardType, setCardType] = useState<CardType>("Physical");
  const [setInitial, setSetInitial] = useState(false);
  const [market, setMarket] = useState("");
  const [markup, setMarkup] = useState("1.2");

  useEffect(() => {
    if (open) {
      setBId(brandId ?? ""); setCId(countryId ?? "");
      setFace(""); setCardType("Physical"); setSetInitial(false); setMarket(""); setMarkup("1.2");
    }
  }, [open, brandId, countryId]);

  const resolvedCurrency = currencyCode
    ?? countries?.find((c) => c.id === cId)?.currencyCode
    ?? "USD";

  const resolvedBrandName = brandName ?? brands?.find((b) => b.id === bId)?.name ?? bId;
  const resolvedCountryName = countryName ?? countries?.find((c) => c.id === cId)?.name ?? cId;
  const resolvedCountryCode = countryCode ?? countries?.find((c) => c.id === cId)?.code ?? "";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!bId || !cId || !face) throw new Error("Fill all required fields");
      const faceNum = parseFloat(face);
      if (!faceNum) throw new Error("Face value must be a number");

      const { id: denomId } = await createDenomination({
        brandId: bId,
        countryId: cId,
        value: faceNum,
        cardType,
      });

      if (setInitial) {
        const marketNum = parseFloat(market);
        if (!marketNum) throw new Error("Market rate required for initial rate");
        const markupNum = parseFloat(markup) || 0;
        await createRate({
          denominationId: denomId,
          marketRateUsd: marketNum,
          markupType: "Percentage",
          markupValue: markupNum,
          source: "Admin",
        });
      }
    },
    onSuccess: () => {
      toast.success(`Added ${resolvedCurrency} ${face} ${cardType} for ${resolvedBrandName} · ${resolvedCountryName}${setInitial ? " (with rate)" : ""}.`);
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
      qc.invalidateQueries({ queryKey: queryKeys.denominations.all() });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Denomination</DialogTitle>
          <DialogDescription>
            {lockBrand && lockCountry && brandName && countryName
              ? `${brandName} · ${countryName} (${resolvedCountryCode} · ${resolvedCurrency})`
              : "Register a new card denomination."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Brand *">
            {lockBrand ? (
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">{resolvedBrandName}</div>
            ) : (
              <Select value={bId} onValueChange={setBId}>
                <SelectTrigger><SelectValue placeholder="Choose brand" /></SelectTrigger>
                <SelectContent>
                  {(brands ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Country *">
            {lockCountry ? (
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm">
                {resolvedCountryName} {resolvedCountryCode && <span className="font-mono text-xs text-muted-foreground">({resolvedCountryCode} · {resolvedCurrency})</span>}
              </div>
            ) : (
              <Select value={cId} onValueChange={setCId}>
                <SelectTrigger><SelectValue placeholder="Choose country" /></SelectTrigger>
                <SelectContent>
                  {(countries ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Face value *" hint="e.g. 10, 25, 50, 100">
              <Input type="number" value={face} onChange={(e) => setFace(e.target.value)} placeholder="100" className="font-mono" />
            </Field>
            <Field label="Currency">
              <div className="rounded-md border bg-secondary/40 px-3 py-2 text-sm font-mono">{resolvedCurrency}</div>
            </Field>
          </div>

          <Field label="Card type *">
            <div className="grid grid-cols-2 gap-2">
              {(["Physical", "ECode"] as CardType[]).map((t) => (
                <button key={t} type="button" onClick={() => setCardType(t)}
                  className={cn("rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    cardType === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary")}>
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <div className="space-y-2 rounded-lg border bg-secondary/30 p-3">
            <label className="flex items-center justify-between text-sm font-medium">
              <span>Set initial rate?</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setSetInitial(false)}
                  className={cn("rounded px-2.5 py-1 text-xs font-medium", !setInitial ? "bg-card shadow-sm" : "text-muted-foreground")}>Skip</button>
                <button type="button" onClick={() => setSetInitial(true)}
                  className={cn("rounded px-2.5 py-1 text-xs font-medium", setInitial ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Set now</button>
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
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add Denomination"}
          </Button>
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
