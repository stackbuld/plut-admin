import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { brands, countries, denominations, rates, brandById, countryById, activeRateForDenom } from "@/data/mock";
import { toast } from "sonner";
import { SetRateDialog } from "@/components/plut/SetRateDialog";

export const Route = createFileRoute("/_app/admin/giftcards/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Plut Admin" }] }),
  component: Catalog,
});

function Catalog() {
  return (
    <Tabs defaultValue="countries" className="space-y-5">
      <TabsList>
        <TabsTrigger value="countries">Countries</TabsTrigger>
        <TabsTrigger value="denominations">Denominations</TabsTrigger>
        <TabsTrigger value="rates">Rates</TabsTrigger>
      </TabsList>
      <TabsContent value="countries"><CountriesTab /></TabsContent>
      <TabsContent value="denominations"><DenominationsTab /></TabsContent>
      <TabsContent value="rates"><RatesTab /></TabsContent>
    </Tabs>
  );
}

function CountriesTab() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [cur, setCur] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Country</Button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Name", "Code", "Currency", "Brands Linked"].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {countries.map((c) => {
              const linked = brands.filter((b) => b.countryIds.includes(c.id));
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-medium">{c.flag} {c.name}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{c.code}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{c.currency}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {linked.slice(0, 3).map((b) => (
                        <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                          <span>{b.logoEmoji}</span>{b.name}
                        </span>
                      ))}
                      {linked.length > 3 && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">+{linked.length - 3}</span>}
                      {linked.length === 0 && <span className="text-xs text-muted-foreground">No brands yet</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Country</DialogTitle><DialogDescription>Register a new country with its currency.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Field label="Country name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="United States" /></Field>
            <Field label="Country code * (ISO 3166 Alpha-3)"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="USA" className="font-mono" /></Field>
            <Field label="Currency code * (ISO 4217)"><Input value={cur} onChange={(e) => setCur(e.target.value.toUpperCase())} placeholder="USD" className="font-mono" /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.success(`Country ${name} added.`); setOpen(false); }}>Add Country</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DenominationsTab() {
  const [brand, setBrand] = useState("All"); const [country, setCountry] = useState("All"); const [type, setType] = useState("All");
  const list = denominations
    .filter((d) => brand === "All" || d.brandId === brand)
    .filter((d) => country === "All" || d.countryId === country)
    .filter((d) => type === "All" || d.cardType === type);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brand} onChange={setBrand} placeholder="Brand" options={[{ v: "All", l: "All brands" }, ...brands.map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={country} onChange={setCountry} placeholder="Country" options={[{ v: "All", l: "All countries" }, ...countries.map((c) => ({ v: c.id, l: c.name }))]} />
        <FilterSelect value={type} onChange={setType} placeholder="Type" options={[{ v: "All", l: "All types" }, { v: "Physical", l: "Physical" }, { v: "E-code", l: "E-code" }]} />
        <span className="ml-auto text-xs text-muted-foreground">{list.length} denomination{list.length === 1 ? "" : "s"}</span>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Brand", "Country", "Amount", "Currency", "Type", "Status"].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {list.map((d) => {
              const b = brandById(d.brandId); const c = countryById(d.countryId);
              return (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5">{b?.logoEmoji} {b?.name}</td>
                  <td className="px-6 py-3.5">{c?.flag} {c?.code}</td>
                  <td className="px-6 py-3.5 font-mono">{d.amount}</td>
                  <td className="px-6 py-3.5 font-mono text-xs">{d.currency}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={d.cardType} dot={false} /></td>
                  <td className="px-6 py-3.5"><StatusBadge status={d.active ? "Active" : "Inactive"} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatesTab() {
  const [rateFor, setRateFor] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60"><tr className="text-left">
            {["Brand", "Country", "Denom", "Mkt Rate", "Cust Rate", "Markup", "Source", "Since", ""].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rates.map((r) => {
              const d = denominations.find((x) => x.id === r.denominationId)!;
              const b = brandById(d.brandId); const c = countryById(d.countryId);
              const markup = ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100;
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5">{b?.logoEmoji} {b?.name}</td>
                  <td className="px-6 py-3.5">{c?.code}</td>
                  <td className="px-6 py-3.5 font-mono">${d.amount}</td>
                  <td className="px-6 py-3.5 text-right font-mono">${r.marketRateUsd.toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-mono">${r.customerRateUsd.toFixed(4)}</td>
                  <td className="px-6 py-3.5 text-right font-mono">{markup.toFixed(1)}%</td>
                  <td className="px-6 py-3.5 text-xs">{r.source === "Manual" ? "M" : "A"}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{r.validFrom}</td>
                  <td className="px-6 py-3.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => setRateFor(r.denominationId)}>Update</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SetRateDialog denomId={rateFor} onClose={() => setRateFor(null)} />
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { v: string; l: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="text-sm font-medium">{label}</label>{children}</div>;
}