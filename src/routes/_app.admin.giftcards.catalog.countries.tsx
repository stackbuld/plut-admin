import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { countryQueries, createCountry, queryKeys } from "@/api";
import { toast } from "sonner";
import { Field, TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { WORLD_COUNTRIES } from "@/data/countries";

export const Route = createFileRoute("/_app/admin/giftcards/catalog/countries")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(countryQueries.list());
  },
  component: CountriesTab,
});

function CountriesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");

  const { data, isLoading } = useQuery(countryQueries.list());

  const mutation = useMutation({
    mutationFn: () => createCountry({ name: name.trim(), code: code.trim().toUpperCase(), currencyCode: currencyCode.trim().toUpperCase() }),
    onSuccess: () => {
      toast.success("Country added.");
      qc.invalidateQueries({ queryKey: queryKeys.countries.all() });
      resetForm();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setName(""); setCode(""); setCurrencyCode("");
  }

  function selectCountry(countryCode: string) {
    const match = WORLD_COUNTRIES.find((c) => c.code === countryCode);
    if (!match) return;
    setName(match.name);
    setCode(match.code);
    setCurrencyCode(match.currencyCode);
  }

  const valid = name.trim() && code.trim().length === 2 && currencyCode.trim().length === 3;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Country</Button>
      </div>
      {isLoading ? <TabLoader /> : (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Name", "Code", "Currency", "Cards Linked"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-medium">{c.name}</td>
                    <td className="px-6 py-3.5 font-mono text-xs">{c.code}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{c.currencyCode}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.linkedBrands.slice(0, 3).map((b) => (
                          <Link key={b.id} to="/admin/giftcards/brands/$brandId" params={{ brandId: b.id }}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs transition-colors hover:bg-primary/15 hover:text-primary">
                            {b.imageUrl
                              ? <img src={b.imageUrl} alt="" className="h-3 w-3 rounded-sm object-contain" />
                              : <span className="font-semibold text-[10px]">{b.name[0]}</span>}
                            {b.name}
                          </Link>
                        ))}
                        {c.linkedBrands.length > 3 && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">+{c.linkedBrands.length - 3}</span>
                        )}
                        {c.linkedBrands.length === 0 && (
                          <span className="text-xs text-muted-foreground">No cards yet</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data ?? []).length === 0 && <EmptyRow cols={4} />}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); } setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Country</DialogTitle>
            <DialogDescription>Register a new country with its currency.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Searchable country picker */}
            <Field label="Search country">
              <Combobox
                value={code}
                onChange={selectCountry}
                placeholder="Select a country…"
                searchPlaceholder="Search countries…"
                emptyText="No country found."
                options={WORLD_COUNTRIES.map((c) => ({
                  value: c.code,
                  label: c.name,
                  keywords: `${c.code} ${c.currencyCode}`,
                  hint: `${c.code} · ${c.currencyCode}`,
                }))}
              />
            </Field>

            {/* Editable fields — pre-filled from picker, overridable */}
            <Field label="Country name *">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="United States" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country code * (ISO 3166-1)">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="US" maxLength={2} className="font-mono" />
              </Field>
              <Field label="Currency code * (ISO 4217)">
                <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} placeholder="USD" maxLength={3} className="font-mono" />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add Country"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
