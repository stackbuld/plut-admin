import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { vasKeys, vasQueries, updateVasProvider } from "@/api/vas";
import { VasProviderStatusBadge } from "@/components/plut/vas/VasStatusBadges";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/providers/$providerId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.providerDetail(params.providerId));
    context.queryClient.ensureQueryData(vasQueries.providerMappingSummary(params.providerId));
  },
  component: VasProviderDetail,
});

function VasProviderDetail() {
  const { providerId } = Route.useParams();
  const qc = useQueryClient();
  const { data: provider, isLoading } = useQuery(vasQueries.providerDetail(providerId));
  const { data: summary, isLoading: summaryLoading } = useQuery(
    vasQueries.providerMappingSummary(providerId),
  );
  const [priorityDraft, setPriorityDraft] = useState<string | null>(null);

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => updateVasProvider(providerId, { isActive }),
    onSuccess: () => {
      toast.success("Provider updated.");
      qc.invalidateQueries({ queryKey: vasKeys.providers() });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  const updatePriority = useMutation({
    mutationFn: (priority: number) => updateVasProvider(providerId, { priority }),
    onSuccess: () => {
      toast.success("Priority updated.");
      qc.invalidateQueries({ queryKey: vasKeys.providers() });
      setPriorityDraft(null);
    },
    onError: (e: Error) => toast.error(e.message || "Update failed."),
  });

  if (isLoading || !provider) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categories = (provider.supportedCategories ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/admin/vas/providers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to providers
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{provider.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{provider.code}</p>
          </div>
          <VasProviderStatusBadge status={provider.status} />
        </div>

        <div className="mt-4 divide-y divide-border rounded-lg border bg-background">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Active</span>
            <Switch
              checked={provider.isActive}
              disabled={toggleActive.isPending}
              onCheckedChange={(checked) => toggleActive.mutate(checked)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Priority</span>
            <input
              type="number"
              defaultValue={provider.priority}
              className="h-8 w-20 rounded-md border bg-background px-2 text-right text-sm"
              onChange={(e) => setPriorityDraft(e.target.value)}
              onBlur={() => {
                if (priorityDraft !== null && Number(priorityDraft) !== provider.priority) {
                  updatePriority.mutate(Number(priorityDraft));
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Success rate</span>
            <span className="font-mono">
              {provider.currentSuccessRate != null ? `${provider.currentSuccessRate}%` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Last health check</span>
            <span>
              {provider.lastHealthCheckAt ? formatDateTime(provider.lastHealthCheckAt) : "never"}
            </span>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Catalog mapping health
        </h3>
        {summaryLoading || !summary ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : summary.categories.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No mappings for this provider yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 font-medium text-right">Services active/retired</th>
                  <th className="py-2 font-medium text-right">Products active/retired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.categories.map((c) => (
                  <tr key={c.serviceCategoryId}>
                    <td className="py-2">{c.serviceCategoryId}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {c.activeServiceMappings} / {c.retiredServiceMappings}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {c.activeProductMappings} / {c.retiredProductMappings}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right font-mono text-xs">
                    {summary.totalActiveServiceMappings} / {summary.totalRetiredServiceMappings}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">
                    {summary.totalActiveProductMappings} / {summary.totalRetiredProductMappings}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
