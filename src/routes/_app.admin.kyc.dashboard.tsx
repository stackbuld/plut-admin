import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, UserX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/plut/StatCard";
import { kycKeys, kycQueries, syncAllUnsyncedKyc } from "@/api/kyc";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/kyc/dashboard")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(kycQueries.stats());
  },
  component: KycDashboard,
});

function KycDashboard() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery(kycQueries.stats());
  const [resyncOpen, setResyncOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {dataUpdatedAt
            ? `Last updated ${format(new Date(dataUpdatedAt), "HH:mm:ss")}`
            : "Loading…"}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      ) : (
        <>
          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Status
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Not Started" value={String(data.byStatus.notStarted)} icon={UserX} />
              <StatCard
                label="Pending"
                value={String(data.byStatus.pending)}
                icon={Clock}
                sublabel={`InReview ${data.byStatus.inReview} · NeedsInfo ${data.byStatus.needsInfo}`}
              />
              <StatCard
                label="Approved"
                value={String(data.byStatus.approved)}
                icon={CheckCircle2}
              />
              <StatCard label="Rejected" value={String(data.byStatus.rejected)} icon={XCircle} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tier distribution
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["tier0", "tier1", "tier2", "tier3"] as const).map((t) => (
                <div key={t} className="rounded-2xl border bg-card p-4 text-center">
                  <p className="font-display text-2xl font-bold">{data.byTier[t]}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {t.replace("tier", "Tier ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" /> Sync health
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <span className="font-display text-xl font-bold">
                  {data.syncHealth.approvedCasesMissingPersonalInfo}
                </span>{" "}
                <span className="text-muted-foreground">
                  approved case(s) missing personal info
                </span>
              </p>
              {data.syncHealth.approvedCasesMissingPersonalInfo > 0 && (
                <Button size="sm" onClick={() => setResyncOpen(true)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Resync all unsynced
                </Button>
              )}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Total users: {data.totalUsers.toLocaleString()}
          </p>
        </>
      )}

      <ResyncAllDialog open={resyncOpen} onOpenChange={setResyncOpen} />
    </div>
  );
}

function ResyncAllDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: syncAllUnsyncedKyc,
    onSuccess: (r) => {
      toast.success(`Resynced ${r.synced} case(s)${r.failed > 0 ? `, ${r.failed} failed` : ""}.`);
      qc.invalidateQueries({ queryKey: kycKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Resync failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resync All Unsynced Cases</DialogTitle>
          <DialogDescription>
            Fetches provider verification detail for every approved case that has never been synced.
            Cases that already have personal info are left untouched — this does not force-refresh
            them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
