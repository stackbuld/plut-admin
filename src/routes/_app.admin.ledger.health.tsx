import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { healthQueries } from "@/api/ledger-health";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/08-SYSTEM_HEALTH_AND_OPS.md — "is the ledger's background
// machinery actually working" without checking logs by hand. Visibility only — no run-now/clear
// controls in this first build (§5).
export const Route = createFileRoute("/_app/admin/ledger/health")({
  component: HealthPage,
});

function HealthPage() {
  const { data: jobs, isLoading: jobsLoading } = useQuery(healthQueries.jobs());
  const [showBacklog, setShowBacklog] = useState(false);
  const { data: backlog, isLoading: backlogLoading } = useQuery({
    ...healthQueries.backlog(),
    enabled: showBacklog,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">System Health &amp; Ops</h1>
        <p className="text-xs text-muted-foreground">
          The ledger's background machinery — accounting-equation checks, stale-hold scans, float
          alerting, manifest reconciliation, and the idempotency backlog.
        </p>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {jobsLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Job", "Ledger", "Last Run", "Status", "Detail"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(jobs ?? []).map((row) => (
                  <tr key={`${row.job}-${row.ledger ?? ""}`} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-medium">{row.job}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{row.ledger ?? "—"}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {row.lastRunAt ? formatDateTime(row.lastRunAt) : "(live query)"}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-6 py-3.5 max-w-[320px] truncate text-xs text-muted-foreground" title={row.detail ?? undefined}>
                      {row.job === "IdempotencyBacklog" && row.status !== "OK" ? (
                        <button onClick={() => setShowBacklog(true)} className="text-primary hover:underline">
                          {row.detail}
                        </button>
                      ) : (
                        row.detail ?? "—"
                      )}
                    </td>
                  </tr>
                ))}
                {(jobs ?? []).length === 0 && <EmptyRow cols={5} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBacklog && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Idempotency Backlog — FAILED records</h3>
          {backlogLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (backlog ?? []).length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No FAILED records.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Key", "Ledger", "Failed Reason", "Age"].map((h) => (
                      <th key={h} className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(backlog ?? []).map((row) => (
                    <tr key={row.normalizedKey} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 max-w-[260px] truncate font-mono text-xs" title={row.normalizedKey}>
                        {row.normalizedKey}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{row.ledger}</td>
                      <td className="py-2.5 pr-4 max-w-[260px] truncate text-xs" title={row.lastError ?? undefined}>
                        {row.lastError ?? "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Read-only. Safely clearing one poisoned key is a deliberate follow-up, not built here yet.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "OK") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> OK
      </span>
    );
  }
  if (status === "Error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
        <XCircle className="h-3.5 w-3.5" /> Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" /> {status}
    </span>
  );
}
