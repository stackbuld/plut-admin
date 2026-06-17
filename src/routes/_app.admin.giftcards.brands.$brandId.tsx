import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Plus, Loader2, Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { AddDenominationDialog } from "@/components/plut/AddDenominationDialog";
import { RatesTable } from "@/components/plut/RatesTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { brandQueries, updateBrand, uploadImage, queryKeys } from "@/api";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/giftcards/brands/$brandId")({
  head: () => ({ meta: [{ title: "Card Detail — Plut Admin" }] }),
  component: BrandDetail,
});

function BrandDetail() {
  const { brandId } = useParams({ from: "/_app/admin/giftcards/brands/$brandId" });
  const qc = useQueryClient();
  const { data: brand, isLoading, isError } = useQuery(brandQueries.detail(brandId));

  const [addDenomOpen, setAddDenomOpen] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const toggleBrandMutation = useMutation({
    mutationFn: () => updateBrand(brandId, { isActive: !brand?.isActive }),
    onSuccess: () => {
      toast.success(`Card ${brand?.isActive ? "paused" : "resumed"}.`);
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !brand) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/giftcards/brands"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cards
        </Link>
        <p className="text-sm text-muted-foreground">Card not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/giftcards/brands"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cards
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            title="Edit card"
            className="group relative grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-xl bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setEditOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setEditOpen(true)}
          >
            {brand.imageUrl ? (
              <img
                src={brand.imageUrl}
                alt={brand.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-2xl font-bold">{brand.name[0]}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">{brand.name}</h2>
            <p className="text-xs text-muted-foreground">
              Code: <span className="font-mono">{brand.code}</span> · Created{" "}
              {formatDate(brand.createdAt)}
            </p>
          </div>
          <StatusBadge status={brand.isActive ? "Active" : "Paused"} className="ml-2" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit Card
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmPause(true)}>
            <Pause className="h-3.5 w-3.5" /> {brand.isActive ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Rates & Catalog</h3>
          <p className="text-xs text-muted-foreground">
            Set or update payout rates for this card. Rows without a rate can't be traded.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddDenomOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Denomination
        </Button>
      </div>

      <RatesTable lockBrandId={brandId} enableDenomActions />

      <EditBrandDialog open={editOpen} brand={brand} onClose={() => setEditOpen(false)} />
      <AddDenominationDialog
        open={addDenomOpen}
        brandId={brandId}
        lockBrand
        brandName={brand.name}
        onClose={() => setAddDenomOpen(false)}
      />

      <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {brand.isActive ? "Pause" : "Resume"} {brand.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {brand.isActive
                ? "Users won't be able to trade any denominations under this card until you resume it."
                : "Users will be able to submit trades for this card again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPause(false);
                toggleBrandMutation.mutate();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImageUploadField({
  preview,
  onChange,
}: {
  preview: string | null;
  onChange: (file: File, preview: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      onChange(file, url);
    },
    [onChange],
  );

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
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full rounded-xl object-contain p-2"
          />
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function EditBrandDialog({
  open,
  brand,
  onClose,
}: {
  open: boolean;
  brand: { id: string; name: string; imageUrl: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(brand.name);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Sync name if brand prop changes while dialog is closed
  useEffect(() => {
    if (!open) {
      setName(brand.name);
    }
  }, [open, brand.name]);

  const reset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
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
      toast.success("Card updated.");
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDirty = name.trim() !== brand.name || !!imageFile;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogDescription>Update the card name or logo.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          <ImageUploadField
            preview={imagePreview ?? (brand.imageUrl || null)}
            onChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
            }}
          />
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Card name</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Card name"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click the logo to change the image.</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!isDirty || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
