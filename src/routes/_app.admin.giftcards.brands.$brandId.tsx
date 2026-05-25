import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Pause, Plus, Pencil, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { brandById, countryById, denomsForBrandCountry, activeRateForDenom } from "@/data/mock";
import { cn } from "@/lib/utils";
import { SetRateDialog } from "@/components/plut/SetRateDialog";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";

export const Route = createFileRoute("/_app/admin/giftcards/brands/$brandId")({
  head: () => ({ meta: [{ title: "Brand Detail — Plut Admin" }] }),
  component: BrandDetail,
});

function BrandDetail() {
  const { brandId } = useParams({ from: "/_app/admin/giftcards/brands/$brandId" });
  const brand = brandById(brandId);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [addDenomCountry, setAddDenomCountry] = useState<string | null>(null);

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
          <Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          <Button variant="outline" size="sm" onClick={() => toast.success(`Brand ${brand.active ? "paused" : "resumed"}.`)}>
            <Pause className="h-3.5 w-3.5" /> {brand.active ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Countries & Catalog</h3>
        <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5" /> Add Country to this Brand</Button>
      </div>

      <div className="space-y-5">
        {brand.countryIds.map((cid) => {
          const c = countryById(cid)!;
          const denoms = denomsForBrandCountry(brand.id, cid);
          return (
            <section key={cid} className="rounded-2xl border bg-card">
              <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h4 className="flex items-center gap-2 font-display text-base font-bold">
                  <span className="text-lg">{c.flag}</span> {c.name}
                  <span className="text-xs font-normal text-muted-foreground">({c.code} · {c.currency})</span>
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setAddDenomCountry(cid)}>
                  <Plus className="h-3.5 w-3.5" /> Add Denomination
                </Button>
              </header>
              {denoms.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No denominations yet for this country.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5">Amount</th><th className="px-5 py-2.5">Type</th>
                      <th className="px-5 py-2.5 text-right">Cust Rate</th><th className="px-5 py-2.5 text-right">Mkt Rate</th>
                      <th className="px-5 py-2.5 text-right">Markup</th><th className="px-5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {denoms.map((d) => {
                      const r = activeRateForDenom(d.id);
                      const noRate = !r;
                      const markup = r ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100 : null;
                      return (
                        <tr key={d.id} className={cn("border-t border-border", noRate && "bg-warning/5")}>
                          <td className="px-5 py-3 font-mono">{c.currency === "USD" ? "$" : c.currency === "GBP" ? "£" : c.currency === "EUR" ? "€" : ""}{d.amount}</td>
                          <td className="px-5 py-3"><StatusBadge status={d.cardType} dot={false} /></td>
                          <td className="px-5 py-3 text-right font-mono">{r ? `$${r.customerRateUsd.toFixed(4)}` : "—"}</td>
                          <td className="px-5 py-3 text-right font-mono">{r ? `$${r.marketRateUsd.toFixed(2)}` : "—"}</td>
                          <td className="px-5 py-3 text-right font-mono">{markup != null ? `${markup.toFixed(1)}%` : "—"}</td>
                          <td className="px-5 py-3 text-right">
                            <Button size="sm" variant={noRate ? "default" : "outline"} onClick={() => setRateFor(d.id)}>
                              {noRate ? "Set Rate" : "Update Rate"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {denoms.some((d) => !activeRateForDenom(d.id)) && (
                <p className="flex items-center gap-2 border-t border-border bg-warning/10 px-5 py-2 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Some denominations have no active rate. Users can't trade them until a rate is set.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <SetRateDialog denomId={rateFor} onClose={() => setRateFor(null)} />
      <AddDenominationDialog brandId={brand.id} countryId={addDenomCountry} onClose={() => setAddDenomCountry(null)} />
    </div>
  );
}