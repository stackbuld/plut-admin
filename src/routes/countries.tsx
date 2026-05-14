import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { countries as initial } from "@/data/mock";

export const Route = createFileRoute("/countries")({
  head: () => ({ meta: [{ title: "Countries — Plut Admin" }] }),
  component: CountriesPage,
});

function CountriesPage() {
  const [rows, setRows] = useState(initial);
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Country
        </button>
      </div>
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["", "Country", "Currency", "Denominations", "Active", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-5 py-4 text-2xl">{c.flag}</td>
                  <td className="px-5 py-4 font-semibold">{c.name}</td>
                  <td className="px-5 py-4 font-mono text-xs">{c.currency}</td>
                  <td className="px-5 py-4">{c.denominations}</td>
                  <td className="px-5 py-4">
                    <Switch checked={c.active} onCheckedChange={v => setRows(r => r.map(x => x.id === c.id ? { ...x, active: v } : x))} />
                  </td>
                  <td className="px-5 py-4">
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
