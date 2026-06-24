import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Upload, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { brandQueries, createBrand, uploadImage, queryKeys } from "@/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

const DEFAULT_CONFIRMATION_MINUTES = 15;

export const Route = createFileRoute("/_app/admin/giftcards/brands")({
  head: () => ({ meta: [{ title: "Cards — Plut Admin" }] }),
  component: BrandsLayout,
});

function BrandsLayout() {
  const isDetail = useRouterState({
    select: (s) => /^\/admin\/giftcards\/brands\/.+/.test(s.location.pathname),
  });
  if (isDetail) return <Outlet />;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Paused">("All");
  const [open, setOpen] = useState(false);

  const { data: brands, isLoading } = useQuery(brandQueries.list());

  const list = (brands ?? [])
    .filter((b) => filter === "All" || (filter === "Active" ? b.isActive : !b.isActive))
    .filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q.toLowerCase()) ||
        b.code.toLowerCase().includes(q.toLowerCase()),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cards…"
            className="h-9 pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", "Active", "Paused"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)} className="ml-auto">
          <Plus className="h-4 w-4" /> Create Card
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {list.map((b) => (
              <Link
                key={b.id}
                to="/admin/giftcards/brands/$brandId"
                params={{ brandId: b.id }}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 active:bg-secondary/40"
              >
                <BrandLogo imageUrl={b.imageUrl} name={b.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{b.name}</p>
                    <StatusBadge status={b.isActive ? "Active" : "Paused"} />
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {b.code} · {b.countryCount} countries · {b.denominationCount} denoms
                  </p>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                No cards found.
              </div>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Card", "Code", "Status", "Countries", "Denominations", "Created"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/giftcards/brands/$brandId"
                        params={{ brandId: b.id }}
                        className="flex items-center gap-3 font-medium hover:text-primary"
                      >
                        <BrandLogo imageUrl={b.imageUrl} name={b.name} size="sm" />
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                      {b.code}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={b.isActive ? "Active" : "Paused"} />
                    </td>
                    <td className="px-6 py-3.5 text-muted-foreground">{b.countryCount}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{b.denominationCount}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDate(b.createdAt)}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-muted-foreground"
                    >
                      No cards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateBrandDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function BrandLogo({
  imageUrl,
  name,
  size,
}: {
  imageUrl: string;
  name: string;
  size: "sm" | "md";
}) {
  const dim = size === "md" ? "h-10 w-10 text-lg" : "h-8 w-8 text-sm";
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={name} className={`${dim} rounded-lg object-contain bg-secondary`} />
    );
  }
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-lg bg-secondary font-semibold`}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function CreateBrandDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [confirmMinutes, setConfirmMinutes] = useState(String(DEFAULT_CONFIRMATION_MINUTES));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setCode("");
    setConfirmMinutes(String(DEFAULT_CONFIRMATION_MINUTES));
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      let resolvedImageUrl: string | undefined;
      if (imageFile) {
        const [result] = await uploadImage(imageFile);
        resolvedImageUrl = result?.absoluteUrl;
      }
      const minutes = Number(confirmMinutes);
      return createBrand({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        imageUrl: resolvedImageUrl,
        confirmationDurationMinutes:
          Number.isFinite(minutes) && minutes > 0
            ? Math.round(minutes)
            : DEFAULT_CONFIRMATION_MINUTES,
      });
    },
    onSuccess: () => {
      toast.success("Card created.");
      qc.invalidateQueries({ queryKey: queryKeys.brands.all() });
      reset();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusText = mutation.isPending
    ? imageFile
      ? "Uploading image…"
      : "Creating…"
    : "Create Card";

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
          <DialogTitle>Create Card</DialogTitle>
          <DialogDescription>Add a new gift card to the catalog.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          <ImageUploadField
            preview={imagePreview}
            onChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
            }}
          />
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Card name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apple"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. APPLE"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirmation duration (minutes)</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={confirmMinutes}
                onChange={(e) => setConfirmMinutes(e.target.value)}
                placeholder={String(DEFAULT_CONFIRMATION_MINUTES)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                How long a trade for this card stays under confirmation. Defaults to{" "}
                {DEFAULT_CONFIRMATION_MINUTES} min.
              </p>
            </div>
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
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !code.trim() || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {statusText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-secondary/40 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
    >
      {preview ? (
        <>
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full rounded-xl object-contain p-1"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span className="text-[10px]">Upload logo</span>
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
