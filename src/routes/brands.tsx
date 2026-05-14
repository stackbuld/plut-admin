import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { brands, denominations, countries } from "@/data/mock";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/brands")({
  head: () => ({ meta: [{ title: "Brands — Plut Admin" }] }),
  component: BrandsPage,
});

function BrandsPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const filtered = brands.filter(b => b.name.toLowerCase().includes(q.toLowerCase()));
  const detail = open ? brands.find(b => b.id === open) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search brands…" className="h-10 w-72 pl-9 rounded-lg" />
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Brand
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(b => (
          <div key={b.id} onClick={() => setOpen(b.id)} className="group cursor-pointer rounded-2xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-[var(--shadow-primary)]">
            <div className="flex items-start justify-between">
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-secondary text-xl font-display font-bold text-muted-foreground">{b.shortName.slice(0, 2).toUpperCase()}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                  <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h3 className="mt-4 font-display text-lg font-bold leading-tight">{b.shortName} Gift Card</h3>
            <p className="mt-1 text-sm text-muted-foreground">Available in {b.countries} countries</p>
            <div className="mt-4">
              <StatusBadge status={b.active ? "Active" : "Inactive"} />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={v => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{detail?.shortName} Gift Card</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr className="text-left">
                      {["Country", "Denomination", "Type", "NGN Payout"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {denominations.filter(d => d.brand === detail.shortName).slice(0, 8).map(d => {
                      const c = countries.find(c => c.name === d.country);
                      return (
                        <tr key={d.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3"><span className="mr-2">{c?.flag}</span>{d.country}</td>
                          <td className="px-4 py-3">{d.amount.toFixed(2)} {d.currency}</td>
                          <td className="px-4 py-3"><StatusBadge status={d.type} /></td>
                          <td className="px-4 py-3 font-semibold">{formatNaira(d.payout)}</td>
                        </tr>
                      );
                    })}
                    {denominations.filter(d => d.brand === detail.shortName).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No denominations yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
