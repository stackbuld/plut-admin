import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Pause, Plus, Pencil, AlertTriangle, MoreHorizontal, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { brandById, countryById } from "@/data/mock";
import { useDenomsForBrandCountry, useActiveRateForDenom, useCatalogStore } from "@/data/store";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/format";
import { SetRateDialog } from "@/components/plut/SetRateDialog";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/admin/giftcards/brands/$brandId")({
  head: () => ({ meta: [{ title: "Brand Detail — Plut Admin" }] }),
  component: BrandDetail,
});

function BrandDetail() {
  const { brandId } = useParams({ from: "/_app/admin/giftcards/brands/$brandId" });
  const brand = brandById(brandId);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [addDenomCountry, setAddDenomCountry] = useState<string | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);
  const toggleDenomination = useCatalogStore((s) => s.toggleDenomination);

  if (!brand) return <p className="text-sm text-muted-foreground">Brand not found.</p>;

  return (
    <div className="space-y-6">
      <Link to="/admin/giftcards/brands" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Brands
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-secondary text-2xl">{brand.logoEmoji}</div>
          <div>
            <h2 className="font-display text-2xl font-bold">{brand.name}</h2>
            <p className="text-xs text-muted-foreground">Code: <span className="font-mono">{brand.code}</span> · Created {brand.createdAt}</p>
          </div>
          <StatusBadge status={brand.active ? "Active" : "Paused"} className="ml-2" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.message("Edit brand modal stub")}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmPause(true)}>
            <Pause className="h-3.5 w-3.5" /> {brand.active ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">Countries & Catalog</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3 w-3" /> A country appears here once its first denomination is added.
        </p>
      </div>

      <div className="space-y-5">
        {brand.countryIds.map((cid) => (
          <CountrySection
            key={cid}
            brandId={brand.id}
            countryId={cid}
            onAddDenom={() => setAddDenomCountry(cid)}
            onSetRate={(id) => setRateFor(id)}
            onToggle={(id, label) => { toggleDenomination(id); toast.success(label); }}
          />
        ))}
      </div>

      <SetRateDialog denomId={rateFor} onClose={() => setRateFor(null)} />
      <AddDenominationDialog
        open={addDenomCountry !== null}
        brandId={brand.id}
        countryId={addDenomCountry ?? undefined}
        lockBrand
        lockCountry
        onClose={() => setAddDenomCountry(null)}
      />

      <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{brand.active ? "Pause" : "Resume"} {brand.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {brand.active
                ? "Users won't be able to trade any denominations under this brand until you resume it."
                : "Users will be able to submit trades for this brand again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toast.success(`Brand ${brand.active ? "paused" : "resumed"}.`)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CountrySection({
  brandId, countryId, onAddDenom, onSetRate, onToggle,
}: {
  brandId: string;
  countryId: string;
  onAddDenom: () => void;
  onSetRate: (id: string) => void;
  onToggle: (id: string, msg: string) => void;
}) {
  const c = countryById(countryId)!;
  const denoms = useDenomsForBrandCountry(brandId, countryId);
  const rates = useCatalogStore((s) => s.rates);
  const sym = currencySymbol(c.currency);
  const someMissing = denoms.some((d) => !rates.some((r) => r.denominationId === d.id && r.active));

  return (
    <section className="rounded-2xl border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h4 className="flex items-center gap-2 font-display text-base font-bold">
          <span className="text-lg">{c.flag}</span> {c.name}
          <span className="text-xs font-normal text-muted-foreground">({c.code} · {c.currency})</span>
        </h4>
        <Button variant="ghost" size="sm" onClick={onAddDenom}>
          <Plus className="h-3.5 w-3.5" /> Add Denomination
        </Button>
      </header>
      {denoms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
          <span>No denominations yet for this country.</span>
          <Button size="sm" variant="outline" onClick={onAddDenom}>
            <Plus className="h-3.5 w-3.5" /> Add the first one
          </Button>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"><table className="w-full min-w-[600px] text-sm">
          <thead className="bg-secondary/40">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2.5">Amount</th><th className="px-5 py-2.5">Type</th>
              <th className="px-5 py-2.5 text-right">Cust Rate</th><th className="px-5 py-2.5 text-right">Mkt Rate</th>
              <th className="px-5 py-2.5 text-right">Markup</th>
              <th className="px-5 py-2.5">Status</th>
              <th className="px-5 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {denoms.map((d) => (
              <DenomRow
                key={d.id}
                d={d}
                sym={sym}
                onSetRate={() => onSetRate(d.id)}
                onToggle={() => onToggle(d.id, `${d.active ? "Deactivated" : "Activated"} ${sym}${d.amount} ${d.cardType}`)}
              />
            ))}
          </tbody>
        </table></div>
      )}
      {someMissing && (
        <p className="flex items-center gap-2 border-t border-border bg-warning/10 px-5 py-2 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5" /> Some denominations have no active rate. Users can't trade them until a rate is set.
        </p>
      )}
    </section>
  );
}

function DenomRow({ d, sym, onSetRate, onToggle }: {
  d: { id: string; amount: number; cardType: string; active: boolean };
  sym: string;
  onSetRate: () => void;
  onToggle: () => void;
}) {
  const r = useActiveRateForDenom(d.id);
  const noRate = !r;
  const markup = r ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100 : null;
  return (
    <tr className={cn("border-t border-border", noRate && "bg-warning/5")}>
      <td className="px-5 py-3 font-mono">{sym}{d.amount}</td>
      <td className="px-5 py-3"><StatusBadge status={d.cardType} dot={false} /></td>
      <td className="px-5 py-3 text-right font-mono">{r ? `$${r.customerRateUsd.toFixed(4)}` : "—"}</td>
      <td className="px-5 py-3 text-right font-mono">{r ? `$${r.marketRateUsd.toFixed(2)}` : "—"}</td>
      <td className="px-5 py-3 text-right font-mono">{markup != null ? `${markup.toFixed(1)}%` : "—"}</td>
      <td className="px-5 py-3">
        {noRate ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
            <AlertTriangle className="h-2.5 w-2.5" /> No rate
          </span>
        ) : (
          <StatusBadge status={d.active ? "Active" : "Paused"} />
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <Button size="sm" variant={noRate ? "default" : "outline"} onClick={onSetRate}>
            {noRate ? "Set Rate" : "Update Rate"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggle}>
                {d.active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
