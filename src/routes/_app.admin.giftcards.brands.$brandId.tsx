import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Plus, AlertTriangle, MoreHorizontal, Info, Loader2, Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { SetRateDialog, type DenomRateContext } from "@/components/plut/SetRateDialog";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  brandQueries, updateBrand, uploadImage, activateDenomination, deactivateDenomination,
  queryKeys, type BrandDenominationDetail, type BrandCountryDetail,
} from "@/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/brands/$brandId")({
  head: () => ({ meta: [{ title: "Brand Detail — Plut Admin" }] }),
  component: BrandDetail,
});

function BrandDetail() {
  const { brandId } = useParams({ from: "/_app/admin/giftcards/brands/$brandId" });
  const qc = useQueryClient();
  const { data: brand, isLoading, isError } = useQuery(brandQueries.detail(brandId));

  const [rateFor, setRateFor] = useState<DenomRateContext | null>(null);
  const [addDenomCountry, setAddDenomCountry] = useState<{ id: string; name: string; code: string; currencyCode: string } | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const toggleBrandMutation = useMutation({
    mutationFn: () => updateBrand(brandId, { isActive: !brand?.isActive }),
    onSuccess: () => {
      toast.success(`Brand ${brand?.isActive ? "paused" : "resumed"}.`);
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDenomMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? deactivateDenomination(id) : activateDenomination(id),
    onSuccess: (_, { active }) => {
      toast.success(`Denomination ${active ? "deactivated" : "activated"}.`);
      qc.invalidateQueries({ queryKey: queryKeys.brands.detail(brandId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (isError || !brand) {
    return (
      <div className="space-y-4">
        <Link to="/admin/giftcards/brands" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Brands
        </Link>
        <p className="text-sm text-muted-foreground">Brand not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/giftcards/brands" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Brands
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            title="Edit brand"
            className="group relative grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-xl bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setEditOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setEditOpen(true)}
          >
            {brand.imageUrl
              ? <img src={brand.imageUrl} alt={brand.name} className="h-full w-full object-contain p-1" />
              : <span className="text-2xl font-bold">{brand.name[0]}</span>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">{brand.name}</h2>
            <p className="text-xs text-muted-foreground">
              Code: <span className="font-mono">{brand.code}</span> · Created {formatDate(brand.createdAt)}
            </p>
          </div>
          <StatusBadge status={brand.isActive ? "Active" : "Paused"} className="ml-2" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit Brand
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmPause(true)}>
            <Pause className="h-3.5 w-3.5" /> {brand.isActive ? "Pause" : "Resume"}
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
        {brand.countries.map((country) => (
          <CountrySection
            key={country.id}
            country={country}
            brandName={brand.name}
            onAddDenom={() => setAddDenomCountry({ id: country.id, name: country.name, code: country.code, currencyCode: country.currencyCode })}
            onSetRate={(ctx) => setRateFor(ctx)}
            onToggle={(id, active) => toggleDenomMutation.mutate({ id, active })}
          />
        ))}
        {brand.countries.length === 0 && (
          <p className="text-sm text-muted-foreground">No countries linked yet. Add denominations to link countries.</p>
        )}
      </div>

      <EditBrandDialog open={editOpen} brand={brand} onClose={() => setEditOpen(false)} />
      <SetRateDialog denom={rateFor} onClose={() => setRateFor(null)} />
      <AddDenominationDialog
        open={addDenomCountry !== null}
        brandId={brandId}
        countryId={addDenomCountry?.id}
        lockBrand
        lockCountry
        brandName={brand.name}
        countryName={addDenomCountry?.name}
        countryCode={addDenomCountry?.code}
        currencyCode={addDenomCountry?.currencyCode}
        onClose={() => setAddDenomCountry(null)}
      />

      <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{brand.isActive ? "Pause" : "Resume"} {brand.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {brand.isActive
                ? "Users won't be able to trade any denominations under this brand until you resume it."
                : "Users will be able to submit trades for this brand again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmPause(false); toggleBrandMutation.mutate(); }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImageUploadField({ preview, onChange }: {
  preview: string | null;
  onChange: (file: File, preview: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    onChange(file, url);
  }, [onChange]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative mx-auto flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-secondary/40 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      {preview ? (
        <>
          <img src={preview} alt="Preview" className="h-full w-full rounded-xl object-contain p-2" />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-6 w-6" />
          <span className="text-xs">Upload logo</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

function EditBrandDialog({ open, brand, onClose }: {
  open: boolean;
  brand: { id: string; name: string; imageUrl: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(brand.name);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Sync name if brand prop changes while dialog is closed
  useEffect(() => { if (!open) { setName(brand.name); } }, [open, brand.name]);

  const reset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const patch: { name?: string; imageUrl?: string } = {};
      if (name.trim() && name.trim() !== brand.name) patch.name = name.trim();
      if (imageFile) {
        const [result] = await uploadImage(imageFile);
        patch.imageUrl = result?.absoluteUrl;
      }
      if (!patch.name && !patch.imageUrl) return;
      await updateBrand(brand.id, patch);
    },
    onSuccess: () => {
      toast.success("Brand updated.");
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDirty = name.trim() !== brand.name || !!imageFile;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
          <DialogDescription>Update the brand name or logo.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          <ImageUploadField
            preview={imagePreview ?? (brand.imageUrl || null)}
            onChange={(file, preview) => { setImageFile(file); setImagePreview(preview); }}
          />
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Brand name</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brand name"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click the logo to change the image.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!isDirty || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountrySection({ country, brandName, onAddDenom, onSetRate, onToggle }: {
  country: BrandCountryDetail;
  brandName: string;
  onAddDenom: () => void;
  onSetRate: (ctx: DenomRateContext) => void;
  onToggle: (denomId: string, active: boolean) => void;
}) {
  const someMissing = country.denominations.some((d) => !d.activeRate);
  return (
    <section className="rounded-2xl border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h4 className="flex items-center gap-2 font-display text-base font-bold">
          {country.name}
          <span className="text-xs font-normal text-muted-foreground">({country.code} · {country.currencyCode})</span>
        </h4>
        <Button variant="ghost" size="sm" onClick={onAddDenom}>
          <Plus className="h-3.5 w-3.5" /> Add Denomination
        </Button>
      </header>

      {country.denominations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
          <span>No denominations yet for this country.</span>
          <Button size="sm" variant="outline" onClick={onAddDenom}><Plus className="h-3.5 w-3.5" /> Add the first one</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5">Amount</th>
                <th className="px-5 py-2.5">Type</th>
                <th className="px-5 py-2.5 text-right">Cust Rate</th>
                <th className="px-5 py-2.5 text-right">Mkt Rate</th>
                <th className="px-5 py-2.5 text-right">Markup</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {country.denominations.map((d) => (
                <DenomRow
                  key={d.id}
                  denom={d}
                  currencyCode={country.currencyCode}
                  onSetRate={() => onSetRate({
                    id: d.id,
                    amount: d.amount,
                    currencyCode: d.currencyCode,
                    cardType: d.cardType,
                    brandName,
                    countryCode: country.code,
                    activeRate: d.activeRate,
                  })}
                  onToggle={() => onToggle(d.id, d.isActive)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {someMissing && (
        <p className="flex items-center gap-2 border-t border-border bg-warning/10 px-5 py-2 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5" /> Some denominations have no active rate — users can't trade them.
        </p>
      )}
    </section>
  );
}

function DenomRow({ denom, currencyCode, onSetRate, onToggle }: {
  denom: BrandDenominationDetail;
  currencyCode: string;
  onSetRate: () => void; // parent already builds context before calling
  onToggle: () => void;
}) {
  const r = denom.activeRate;
  const markup = r ? ((r.marketRateUsd - r.customerRateUsd) / r.marketRateUsd) * 100 : null;
  const noRate = !r;

  return (
    <tr className={cn("border-t border-border", noRate && "bg-warning/5")}>
      <td className="px-5 py-3 font-mono">{currencyCode} {denom.amount}</td>
      <td className="px-5 py-3"><StatusBadge status={denom.cardType} dot={false} /></td>
      <td className="px-5 py-3 text-right font-mono">{r ? `$${r.customerRateUsd.toFixed(4)}` : "—"}</td>
      <td className="px-5 py-3 text-right font-mono">{r ? `$${r.marketRateUsd.toFixed(2)}` : "—"}</td>
      <td className="px-5 py-3 text-right font-mono">{markup != null ? `${markup.toFixed(1)}%` : "—"}</td>
      <td className="px-5 py-3">
        {noRate ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
            <AlertTriangle className="h-2.5 w-2.5" /> No rate
          </span>
        ) : (
          <StatusBadge status={denom.isActive ? "Active" : "Paused"} />
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
              <DropdownMenuItem onClick={onToggle}>{denom.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
