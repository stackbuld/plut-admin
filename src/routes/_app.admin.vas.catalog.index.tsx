import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Loader2, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LimitsDialog } from "@/components/plut/catalog-shared";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { vasKeys, vasQueries, updateVasCategory } from "@/api/vas";
import type { VasAdminCategory } from "@/api/types/vas.types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/vas/catalog/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(vasQueries.categoryList());
  },
  component: VasCategoriesList,
});

function VasCategoriesList() {
  const { data, isLoading } = useQuery(vasQueries.categoryList());
  const [editingLimits, setEditingLimits] = useState<VasAdminCategory | null>(null);

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No categories configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <CategoryRow key={c.id} category={c} onEditLimits={() => setEditingLimits(c)} />
          ))}
        </div>
      )}

      {editingLimits && (
        <CategoryLimitsDialog category={editingLimits} onClose={() => setEditingLimits(null)} />
      )}
    </div>
  );
}

function CategoryRow({
  category: c,
  onEditLimits,
}: {
  category: VasAdminCategory;
  onEditLimits: () => void;
}) {
  const qc = useQueryClient();
  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => updateVasCategory(c.id, { isActive }),
    onSuccess: () => {
      toast.success("Category updated.");
      qc.invalidateQueries({ queryKey: vasKeys.catalog() });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4">
      <Link
        to="/admin/vas/catalog/$categoryId"
        params={{ categoryId: c.id }}
        className="flex min-w-0 flex-1 items-start gap-3 transition-colors hover:text-primary"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{c.name}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {c.serviceCount} service{c.serviceCount === 1 ? "" : "s"}
            </span>
            {c.requiresCustomerValidation && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                validation required
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{c.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            band {c.minAmount != null ? formatVasAmount(c.minAmount, c.defaultCurrencyCode) : "—"} –{" "}
            {c.maxAmount != null ? formatVasAmount(c.maxAmount, c.defaultCurrencyCode) : "—"} · sort{" "}
            {c.sortOrder}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onEditLimits}
          title="Edit amount limits"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Switch
          checked={c.isActive}
          disabled={toggleActive.isPending}
          onCheckedChange={(v) => toggleActive.mutate(v)}
        />
      </div>
    </div>
  );
}

function CategoryLimitsDialog({
  category: c,
  onClose,
}: {
  category: VasAdminCategory;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: { min?: number; max?: number }) =>
      updateVasCategory(c.id, { minAmount: vars.min, maxAmount: vars.max }),
    onSuccess: () => {
      toast.success("Limits updated.");
      qc.invalidateQueries({ queryKey: vasKeys.catalog() });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  return (
    <LimitsDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={c.name}
      currentMin={c.minAmount}
      currentMax={c.maxAmount}
      isPending={mutation.isPending}
      onSave={(min, max) => mutation.mutate({ min, max })}
    />
  );
}
