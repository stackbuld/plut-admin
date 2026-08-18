import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { vasKeys, vasQueries, updateVasProduct } from "@/api/vas";
import type { VasAdminProduct } from "@/api/types/vas.types";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/vas/catalog/$categoryId/$serviceId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.productList(params.serviceId));
  },
  component: VasProductsList,
});

function VasProductsList() {
  const { categoryId, serviceId } = Route.useParams();
  const { data, isLoading } = useQuery(vasQueries.productList(serviceId));

  return (
    <div className="space-y-5">
      <Link
        to="/admin/vas/catalog/$categoryId"
        params={{ categoryId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to services
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No products for this service yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ product: p }: { product: VasAdminProduct }) {
  const qc = useQueryClient();
  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => updateVasProduct(p.id, { isActive }),
    onSuccess: () => {
      toast.success("Product updated.");
      qc.invalidateQueries({ queryKey: vasKeys.catalog() });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{p.name}</p>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {p.productType}
          </span>
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
              (p.hasActiveProviderMapping
                ? "bg-success/15 text-success ring-1 ring-success/30"
                : "bg-destructive/15 text-destructive ring-1 ring-destructive/30")
            }
          >
            {p.hasActiveProviderMapping ? "mapped" : "unmapped"}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{p.code}</p>
        {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}

        {p.dataPlan && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {p.dataPlan.allowance} · {p.dataPlan.validity}
            {p.dataPlan.isNightPlan ? " · night plan" : ""}
            {p.dataPlan.isSocialPlan ? " · social plan" : ""}
          </p>
        )}

        {p.cablePackage && (
          <div className="mt-2 space-y-1">
            {p.cablePackage.isAddon && (
              <p className="text-[11px] text-muted-foreground">addon package</p>
            )}
            {p.cablePackage.availablePricingOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.cablePackage.availablePricingOptions.map((o) => (
                  <span
                    key={o.monthsPaidFor}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {o.monthsPaidFor}mo — {formatVasAmount(o.price, p.currencyCode)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {p.baseAmount != null && (
          <span className="font-mono text-sm font-semibold">
            {formatVasAmount(p.baseAmount, p.currencyCode)}
          </span>
        )}
        <Switch
          checked={p.isActive}
          disabled={toggleActive.isPending}
          onCheckedChange={(v) => toggleActive.mutate(v)}
        />
      </div>
    </div>
  );
}
