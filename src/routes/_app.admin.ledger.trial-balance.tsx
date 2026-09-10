import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { ledgerQueries } from "@/api/ledger";
import { trialBalanceQueries } from "@/api/ledger-trial-balance";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/06-TRIAL_BALANCE_AND_RECONCILIATION.md — proves the books
// balance: Assets − Liabilities − Equity − Revenue + Expenses = 0, per asset. A live snapshot, not
// a historical point-in-time query (see the backend query's own doc-comment for why).
export const Route = createFileRoute("/_app/admin/ledger/trial-balance")({
  component: TrialBalancePage,
});

function TrialBalancePage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const { data, isLoading, isFetching } = useQuery(trialBalanceQueries.detail(ledger));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Trial Balance</h1>
          <p className="text-xs text-muted-foreground">
            {data ? `As of ${formatDateTime(data.asOf)}` : "The fundamental accounting-equation check, per asset."}
          </p>
        </div>
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
      </div>

      {data?.truncated && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          This ledger has more accounts than one scan pass covers — totals below may be incomplete.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (data?.byAsset ?? []).length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No accounts found for this ledger.
        </div>
      ) : (
        <div className="space-y-4">
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          {data!.byAsset.map((row) => (
            <div key={row.assetCode} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{row.assetCode}</h3>
                {row.balanced ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> Off by {row.offByMinor.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
                <TbRow label="Assets" value={row.assetsMinor} />
                <TbRow label="Liabilities" value={row.liabilitiesMinor} />
                <TbRow label="Equity" value={row.equityMinor} />
                <TbRow label="Revenue" value={row.revenueMinor} />
                <TbRow label="Expenses" value={row.expensesMinor} />
                <TbRow label="World (excluded)" value={row.worldMinor} muted />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TbRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`font-mono ${muted ? "text-muted-foreground" : ""}`}>{value.toLocaleString()}</span>
    </div>
  );
}
