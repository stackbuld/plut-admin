import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LimitsDialog } from "@/components/plut/catalog-shared";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { vasKeys, vasQueries, updateVasService } from "@/api/vas";
import type { VasAdminService } from "@/api/types/vas.types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/vas/catalog/$categoryId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.serviceList(params.categoryId));
  },
  component: VasServicesList,
});

function VasServicesList() {
  const { categoryId } = Route.useParams();
  const { data, isLoading } = useQuery(vasQueries.serviceList(categoryId));
  const [editingLimits, setEditingLimits] = useState<VasAdminService | null>(null);

  return (
    <div className="space-y-5">
      <Link
        to="/admin/vas/catalog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to categories
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No services in this category yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <ServiceRow key={s.id} service={s} onEditLimits={() => setEditingLimits(s)} />
          ))}
        </div>
      )}

      {editingLimits && (
        <ServiceLimitsDialog service={editingLimits} onClose={() => setEditingLimits(null)} />
      )}
    </div>
  );
}

function ServiceRow({
  service: s,
  onEditLimits,
}: {
  service: VasAdminService;
  onEditLimits: () => void;
}) {
  const qc = useQueryClient();
  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => updateVasService(s.id, { isActive }),
    onSuccess: () => {
      toast.success("Service updated.");
      qc.invalidateQueries({ queryKey: vasKeys.catalog() });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4">
      <Link
        to="/admin/vas/catalog/$categoryId/$serviceId"
        params={{ categoryId: s.serviceCategoryId, serviceId: s.id }}
        className="flex min-w-0 flex-1 items-start gap-3 transition-colors hover:text-primary"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{s.name}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {s.productCount} product{s.productCount === 1 ? "" : "s"}
            </span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                (s.hasActiveProviderMapping
                  ? "bg-success/15 text-success ring-1 ring-success/30"
                  : "bg-destructive/15 text-destructive ring-1 ring-destructive/30")
              }
            >
              {s.hasActiveProviderMapping ? "mapped" : "unmapped"}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{s.code}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            band {s.minAmount != null ? formatVasAmount(s.minAmount) : "—"} –{" "}
            {s.maxAmount != null ? formatVasAmount(s.maxAmount) : "—"}
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
          checked={s.isActive}
          disabled={toggleActive.isPending}
          onCheckedChange={(v) => toggleActive.mutate(v)}
        />
      </div>
    </div>
  );
}

function ServiceLimitsDialog({
  service: s,
  onClose,
}: {
  service: VasAdminService;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: { min?: number; max?: number }) =>
      updateVasService(s.id, { minAmount: vars.min, maxAmount: vars.max }),
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
      title={s.name}
      currentMin={s.minAmount}
      currentMax={s.maxAmount}
      isPending={mutation.isPending}
      onSave={(min, max) => mutation.mutate({ min, max })}
    />
  );
}
