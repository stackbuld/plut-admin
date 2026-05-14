import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { denominations as initial, brands, countries } from "@/data/mock";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/denominations")({
  head: () => ({ meta: [{ title: "Denominations — Plut Admin" }] }),
  component: DenomPage,
});

function DenomPage() {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("all");
  const [country, setCountry] = useState("all");

  const filtered = useMemo(() => rows.filter(r =>
    (brand === "all" || r.brand === brand) &&
    (country === "all" || r.country === country) &&
    (!q || r.id.toLowerCase().includes(q.toLowerCase()) || r.brand.toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, brand, country]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="h-10 w-64 pl-9 rounded-lg" />
        </div>
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="h-10 w-44 rounded-lg"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map(b => <SelectItem key={b.id} value={b.shortName}>{b.shortName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-10 w-44 rounded-lg"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Amount", "Brand", "Country", "Card Type", "FX Rate", "NGN Payout", "Active", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-mono">${"".replace}{d.amount.toFixed(2)} {d.currency}</td>
                  <td className="px-5 py-3.5 font-medium">{d.brand}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{d.country}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={d.type} /></td>
                  <td className="px-5 py-3.5 font-mono text-xs">×{d.rate.toLocaleString()}</td>
                  <td className="px-5 py-3.5 font-semibold">{formatNaira(d.payout)}</td>
                  <td className="px-5 py-3.5">
                    <Switch checked={d.active} onCheckedChange={v => setRows(r => r.map(x => x.id === d.id ? { ...x, active: v } : x))} />
                  </td>
                  <td className="px-5 py-3.5">
                    <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
