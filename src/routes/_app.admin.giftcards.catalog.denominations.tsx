import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";
import { SetRateDialog, type DenomRateContext } from "@/components/plut/SetRateDialog";
import {
  brandQueries, countryQueries,
  denominationQueries, activateDenomination, deactivateDenomination,
  queryKeys,
} from "@/api";
import { toast } from "sonner";
import { currencySymbol } from "@/lib/format";
import { FilterSelect, TabLoader, EmptyRow } from "@/components/plut/catalog-shared";

export const Route = createFileRoute("/_app/admin/giftcards/catalog/denominations")({
  loader: ({ context }) => {
    const qc = context.queryClient;
    qc.prefetchQuery(denominationQueries.list({ PageSize: 100 }));
    qc.prefetchQuery(brandQueries.list());
    qc.prefetchQuery(countryQueries.list());
  },
  component: DenominationsTab,
});

function DenominationsTab() {
  const qc = useQueryClient();
  const [brandFilter, setBrandFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<{ label: string } | null>(null);
  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);

  const { data, isLoading } = useQuery(denominationQueries.list({ PageSize: 100 }));
  const { data: brands } = useQuery(brandQueries.list());
  const { data: countries } = useQuery(countryQueries.list());

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? deactivateDenomination(id) : activateDenomination(id),
    onSuccess: () => {
      toast.success("Updated.");
      qc.invalidateQueries({ queryKey: queryKeys.denominations.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (data?.items ?? [])
    .filter((d) => brandFilter === "All" || d.brandId === brandFilter)
    .filter((d) => countryFilter === "All" || d.countryId === countryFilter)
    .filter((d) => typeFilter === "All" || d.cardType === typeFilter)
    .filter((d) => statusFilter === "All" || (statusFilter === "Active" ? d.isActive : !d.isActive));

  return (
    <div className="space-y-4">
      {justAdded && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span>
              <span className="font-semibold">{justAdded.label}</span>{" "}
              <span className="text-muted-foreground">— Rate not set.</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => toast.info("Open the Rates tab and click Set Rate for this denomination.")}>
              Set rate now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setJustAdded(null)}>Dismiss</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={brandFilter} onChange={setBrandFilter} placeholder="Brand"
          options={[{ v: "All", l: "All brands" }, ...(brands ?? []).map((b) => ({ v: b.id, l: b.name }))]} />
        <FilterSelect value={countryFilter} onChange={setCountryFilter} placeholder="Country"
          options={[{ v: "All", l: "All countries" }, ...(countries ?? []).map((c) => ({ v: c.id, l: c.name }))]} />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="Type"
          options={[{ v: "All", l: "All types" }, { v: "Physical", l: "Physical" }, { v: "ECode", l: "E-code" }]} />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="Status"
          options={[{ v: "All", l: "All statuses" }, { v: "Active", l: "Active" }, { v: "Inactive", l: "Inactive" }]} />
        <span className="ml-auto text-xs text-muted-foreground">{list.length} denomination{list.length === 1 ? "" : "s"}</span>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Denomination</Button>
      </div>

      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Brand", "Country", "Amount", "Currency", "Type", "Status", ""].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const b = brands?.find((x) => x.id === d.brandId);
                  const c = countries?.find((x) => x.id === d.countryId);
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="px-6 py-3.5">
                        <Link to="/admin/giftcards/brands/$brandId" params={{ brandId: d.brandId }} className="inline-flex items-center gap-2 hover:text-primary">
                          {b?.imageUrl
                            ? <img src={b.imageUrl} alt="" className="h-4 w-4 rounded object-contain" />
                            : <span className="text-sm">{b?.name[0] ?? "?"}</span>}
                          {d.brandName}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">{c?.code ?? d.countryName}</td>
                      <td className="px-6 py-3.5 font-mono">{currencySymbol(d.currencyCode)}{d.amount}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{d.currencyCode}</td>
                      <td className="px-6 py-3.5"><StatusBadge status={d.cardType} dot={false} /></td>
                      <td className="px-6 py-3.5"><StatusBadge status={d.isActive ? "Active" : "Paused"} /></td>
                      <td className="px-6 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleMutation.mutate({ id: d.id, active: d.isActive })}>
                              {d.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddDenominationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <SetRateDialog denom={rateFor} onClose={() => setRateFor(null)} />
    </div>
  );
}