import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ledgerQueries } from "@/api/ledger";
import { scanManifestReconciliation } from "@/api/ledger-trial-balance";
import type { ManifestReconciliationDto } from "@/api/types/ledger-trial-balance.types";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/06-TRIAL_BALANCE_AND_RECONCILIATION.md §2 "Manifest
// reconciliation" — the screen that, had it existed and been run at deploy time, would have caught
// this plan's founding incident directly. Read-only: never writes to Formance or the manifest.
export const Route = createFileRoute("/_app/admin/ledger/reconciliation")({
  component: ReconciliationPage,
});

function ReconciliationPage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");
  const [result, setResult] = useState<ManifestReconciliationDto | null>(null);

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const scan = useMutation({
    mutationFn: () => scanManifestReconciliation(ledger),
    onSuccess: (data) => setResult(data),
    onError: (e: Error) => toast.error(e.message || "Scan failed."),
  });

  useEffect(() => {
    setResult(null);
  }, [ledger]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Manifest Reconciliation</h1>
          <p className="max-w-xl text-xs text-muted-foreground">
            Diffs the static account manifest (what accounts are supposed to exist) against what
            actually exists in Formance. Run on demand — nothing here runs automatically yet.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <select
            value={ledger}
            onChange={(e) => setLedger(e.target.value)}
            className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {(ledgers ?? []).map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          <Button onClick={() => scan.mutate()} disabled={!ledger || scan.isPending}>
            {scan.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Run scan
          </Button>
        </div>
      </div>

      {!result ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {scan.isPending ? "Scanning…" : "Run a scan to compare the manifest against Formance."}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Scanned {formatDateTime(result.scannedAt)}</p>

          {result.truncated && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              This ledger has more accounts than one scan pass covers — results below may be incomplete.
            </div>
          )}

          <div className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">
              In Formance, not in manifest ({result.inFormanceNotManifest.length})
            </h3>
            {result.inFormanceNotManifest.length === 0 ? (
              <EmptyOk />
            ) : (
              <ul className="divide-y divide-border">
                {result.inFormanceNotManifest.map((row) => (
                  <li key={row.account} className="flex items-center justify-between py-2 text-xs">
                    <span className="flex items-center gap-2 font-mono">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      {row.account}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {Object.entries(row.balances)
                        .map(([asset, bal]) => `${bal.toLocaleString()} ${asset}`)
                        .join(", ") || "no balance"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold">
              In manifest, not in Formance ({result.inManifestNotFormance.length})
            </h3>
            {result.inManifestNotFormance.length === 0 ? (
              <EmptyOk />
            ) : (
              <ul className="divide-y divide-border">
                {result.inManifestNotFormance.map((account) => (
                  <li key={account} className="py-2 font-mono text-xs">
                    {account}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyOk() {
  return (
    <p className="flex items-center gap-2 py-2 text-xs text-success">
      <CheckCircle2 className="h-3.5 w-3.5" /> none
    </p>
  );
}
