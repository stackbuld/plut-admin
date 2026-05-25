import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { brands, countryById } from "@/data/mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/giftcards/brands")({
  head: () => ({ meta: [{ title: "Brands — Plut Admin" }] }),
  component: BrandsLayout,
});

function BrandsLayout() {
  const isDetail = useRouterState({ select: (s) => /^\/admin\/giftcards\/brands\/.+/.test(s.location.pathname) });
  if (isDetail) return <Outlet />;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Paused">("All");
  const [open, setOpen] = useState(false);

  const list = brands
    .filter((b) => filter === "All" || (filter === "Active" ? b.active : !b.active))
    .filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.code.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands…" className="h-9 pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Active", "Paused"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)} className="ml-auto"><Plus className="h-4 w-4" /> Create Brand</Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60">
            <tr className="text-left">
              {["Brand", "Code", "Status", "Countries", "Created"].map((h) => (
                <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="group border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                <td className="px-6 py-3.5">
                  <Link to="/admin/giftcards/brands/$brandId" params={{ brandId: b.id }} className="flex items-center gap-3 font-medium hover:text-primary">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-base">{b.logoEmoji}</span>
                    {b.name}
                  </Link>
                </td>
                <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{b.code}</td>
                <td className="px-6 py-3.5"><StatusBadge status={b.active ? "Active" : "Paused"} /></td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {b.countryIds.slice(0, 4).map((cid) => <span key={cid} className="text-base leading-none" title={countryById(cid)?.name}>{countryById(cid)?.flag}</span>)}
                    {b.countryIds.length > 4 && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">+{b.countryIds.length - 4}</span>}
                  </div>
                </td>
                <td className="px-6 py-3.5 text-xs text-muted-foreground">{b.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateBrandDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateBrandDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [logo, setLogo] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Brand</DialogTitle>
          <DialogDescription>Add a new brand. You'll be able to attach countries and denominations after.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Brand name *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Apple" /></Field>
          <Field label="Brand code *" hint="Unique, uppercase. Cannot be changed after creation.">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="APPLE" className="font-mono" />
          </Field>
          <Field label="Logo URL (optional)"><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://cdn.plut.finance/…" /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { toast.success(`Brand "${name || code}" created.`); onOpenChange(false); }}>Create Brand</Button>
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