import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { vasKeys, vasQueries, syncVasProviders } from "@/api/vas";
import type { VasAdminProvider } from "@/api/types/vas.types";
import { VasProviderStatusBadge } from "@/components/plut/vas/VasStatusBadges";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/providers/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(vasQueries.providerList());
  },
  component: VasProvidersList,
});

function VasProvidersList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(vasQueries.providerList());

  const syncMutation = useMutation({
    mutationFn: syncVasProviders,
    onSuccess: () => {
      toast.success("Catalog sync started — this may take a minute to fully reflect here.");
      qc.invalidateQueries({ queryKey: vasKeys.providers() });
    },
    onError: (e: Error) => toast.error(e.message || "Sync failed to start."),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Sync Now
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No providers configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <ProviderRow key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderRow({ provider }: { provider: VasAdminProvider }) {
  const categories = (provider.supportedCategories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return (
    <Link
      to="/admin/vas/providers/$providerId"
      params={{ providerId: provider.id }}
      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{provider.name}</p>
          <VasProviderStatusBadge status={provider.status} />
          {!provider.isActive && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              inactive
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {provider.code} · priority {provider.priority}
        </p>
        {categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold">
          {provider.currentSuccessRate != null ? `${provider.currentSuccessRate}%` : "—"}
        </p>
        <p className="text-[11px] text-muted-foreground">success rate</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {provider.lastHealthCheckAt ? relativeTime(provider.lastHealthCheckAt) : "no checks yet"}
        </p>
      </div>
    </Link>
  );
}
