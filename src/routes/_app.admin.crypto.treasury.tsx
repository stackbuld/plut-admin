import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import {
  cryptoTreasuryQueries,
  cryptoTreasuryKeys,
  runTreasuryReconciliation,
} from "@/api";
import {
  CRYPTO_TREASURY_RECONCILIATION_TOO_SOON,
  CRYPTO_TREASURY_RECONCILIATION_TIMED_OUT,
} from "@/api/types/crypto-treasury.types";
import type { TreasuryAssetReconciliation } from "@/api/types";
import { toast } from "sonner";
import { formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Route/API background: docs/wallet-service-docs/crypto-wallet/admin-console/10-TREASURY_RECONCILIATION.md
// Backend is fully built (crypto-service's Treasury reconciliation endpoints) — this route is pure
// frontend against it. This is the screen that answers whether Plut's own wallet balances,
// Formance's aggregate custody account, and Binance's live sub-account balances still agree —
// per the doc's §1, the single most important integrity check for a custodial crypto product.
// Closest existing pattern mirrored: crypto/pricing/fx-rates (single-page route, a primary data
// table, a dialog/button-triggered mutation, inline-expandable per-row detail) — here the mutation
// is "Run now" (a fresh live computation) and the expandable detail is a per-sub-account breakdown
// rather than rate history.

// "Run now" is an expensive live Binance query across every sub-account (doc §2) — the backend
// enforces a minimum cooldown between runs (422 CRYPTO_TREASURY_RECONCILIATION_TOO_SOON). The doc's
// mockup calls out "e.g. disabled if the last run was under 5 minutes ago" as the illustrative
// cooldown; we mirror that client-side so the button is proactively disabled with a countdown
// instead of only ever finding out via a failed request, while still treating the server's 422 as
// the authority (handled below) in case the actual server-side cooldown differs.
const CLIENT_COOLDOWN_MS = 5 * 60 * 1000;

export const Route = createFileRoute("/_app/admin/crypto/treasury")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(cryptoTreasuryQueries.snapshot());
  },
  component: TreasuryReconciliationPage,
});

function TreasuryReconciliationPage() {
  const qc = useQueryClient();
  const { data: snapshot, isLoading } = useQuery(cryptoTreasuryQueries.snapshot());

  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  // Re-render every 15s so the cooldown countdown and "Last run: Xm ago" label stay live without
  // requiring a manual refresh or a full data refetch.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const runMutation = useMutation({
    mutationFn: runTreasuryReconciliation,
    onSuccess: (fresh) => {
      qc.setQueryData(cryptoTreasuryKeys.snapshot(), fresh);
      const driftCount = (fresh.assets ?? []).filter((a) => a.status === "Drift").length;
      if (driftCount > 0) {
        toast.warning(`Reconciliation complete — ${driftCount} asset${driftCount === 1 ? "" : "s"} drifting.`);
      } else {
        toast.success("Reconciliation complete — everything matches.");
      }
    },
    onError: (e: Error) => {
      if (e.message === CRYPTO_TREASURY_RECONCILIATION_TOO_SOON) {
        toast.error("Reconciliation ran too recently. Try again in a few minutes.");
      } else if (e.message === CRYPTO_TREASURY_RECONCILIATION_TIMED_OUT) {
        toast.error("The reconciliation run didn't finish in time. Try again.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const cooldownRemainingMs = useMemo(() => {
    if (!snapshot?.computedAt) return 0;
    const elapsed = Date.now() - new Date(snapshot.computedAt).getTime();
    return Math.max(0, CLIENT_COOLDOWN_MS - elapsed);
  }, [snapshot?.computedAt]);

  const runDisabled = runMutation.isPending || cooldownRemainingMs > 0;
  const cooldownLabel =
    cooldownRemainingMs > 0 ? `Available in ${Math.ceil(cooldownRemainingMs / 60_000)}m` : null;

  const driftAssets = (snapshot?.assets ?? []).filter((a) => a.status === "Drift");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Treasury Reconciliation</h1>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Compares Plut's own wallet balances, Formance's custody account, and Binance's live
            sub-account balances per asset. Drift here means a missed webhook, a failed ledger
            post, a sync bug, or worse — this is the screen that catches it first.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {snapshot?.hasRun && snapshot.computedAt && (
            <span className="text-xs text-muted-foreground">
              Last run: {relativeTime(snapshot.computedAt)}
            </span>
          )}
          <div className="flex flex-col items-end gap-1">
            <Button onClick={() => runMutation.mutate()} disabled={runDisabled}>
              <RefreshCw className={cn("h-4 w-4", runMutation.isPending && "animate-spin")} />
              {runMutation.isPending ? "Running…" : "Run now"}
            </Button>
            {cooldownLabel && !runMutation.isPending && (
              <span className="text-[11px] text-muted-foreground">{cooldownLabel}</span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <TabLoader />
      ) : !snapshot?.hasRun ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card py-16 text-center">
          <p className="text-sm font-medium">Reconciliation has never been run.</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Run it now to compute the first snapshot comparing Plut wallets, Formance custody, and
            live Binance balances across every active sub-account.
          </p>
        </div>
      ) : (
        <>
          {(snapshot.subAccountsFailed > 0 || snapshot.totalActiveSubAccounts > 0) && (
            <p className="text-xs text-muted-foreground">
              Checked {snapshot.subAccountsChecked}/{snapshot.totalActiveSubAccounts} active
              sub-accounts as of {snapshot.computedAt ? formatDateTime(snapshot.computedAt) : "—"}
              {snapshot.subAccountsFailed > 0 && (
                <span className="text-destructive"> — {snapshot.subAccountsFailed} failed to check</span>
              )}
              .
            </p>
          )}

          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    {["Asset", "Plut Wallets (Σ)", "Formance Custody", "Binance (live)", "Δ", "Status", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(snapshot.assets ?? []).map((row) => (
                    <AssetRow
                      key={row.asset}
                      row={row}
                      isExpanded={expandedAsset === row.asset}
                      onToggle={() => setExpandedAsset(expandedAsset === row.asset ? null : row.asset)}
                    />
                  ))}
                  {(snapshot.assets ?? []).length === 0 && <EmptyRow cols={7} />}
                </tbody>
              </table>
            </div>
          </div>

          {expandedAsset && <BreakdownPanel asset={expandedAsset} />}

          {driftAssets.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Drift detected on {driftAssets.map((a) => a.asset).join(", ")} — investigate before
                it compounds. Expand a drifting asset's row above for a per-sub-account breakdown.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssetRow({
  row,
  isExpanded,
  onToggle,
}: {
  row: TreasuryAssetReconciliation;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isDrift = row.status === "Drift";
  return (
    <tr className={cn("border-b border-border last:border-0", isDrift ? "bg-destructive/5" : "hover:bg-secondary/40")}>
      <td className="px-6 py-3.5 font-mono font-semibold text-xs">{row.asset}</td>
      <td className="px-6 py-3.5 font-mono">{formatAmount(row.plutWalletsSum)}</td>
      <td className="px-6 py-3.5 font-mono">{formatAmount(row.formanceCustodyTotal)}</td>
      <td className="px-6 py-3.5 font-mono">{formatAmount(row.binanceLiveSum)}</td>
      <td className={cn("px-6 py-3.5 font-mono", isDrift && "text-destructive")}>
        {row.delta > 0 ? "+" : ""}
        {formatAmount(row.delta)}
      </td>
      <td className="px-6 py-3.5">
        {isDrift ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" /> Drift
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Matched
          </span>
        )}
      </td>
      <td className="px-6 py-3.5 text-right">
        {isDrift && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onToggle}>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {isExpanded ? "Hide" : "Investigate"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function BreakdownPanel({ asset }: { asset: string }) {
  const { data: rows, isLoading } = useQuery(cryptoTreasuryQueries.breakdown(asset));
  const offRows = (rows ?? []).filter((r) => r.delta !== 0);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <p className="text-sm font-semibold">{asset} — per-sub-account breakdown (live)</p>
        {isLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>
      {isLoading ? (
        <TabLoader />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["User", "Sub-Account", "Plut Wallet", "Binance (live)", "Δ"].map((h) => (
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
              {offRows.map((r) => (
                <tr key={r.exchangeSubAccountId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3 font-mono text-xs">{r.userId}</td>
                  <td className="px-6 py-3 font-mono text-xs">{r.exchangeSubAccountId}</td>
                  <td className="px-6 py-3 font-mono">{formatAmount(r.plutWalletBalance)}</td>
                  <td className="px-6 py-3 font-mono">{formatAmount(r.binanceBalance)}</td>
                  <td className="px-6 py-3 font-mono text-destructive">
                    {r.delta > 0 ? "+" : ""}
                    {formatAmount(r.delta)}
                  </td>
                </tr>
              ))}
              {!isLoading && offRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No individual sub-account is off — the aggregate delta isn't explained by any
                    single sub-account (or offsetting sub-accounts have since resolved).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Crypto amounts range from satoshi-scale BTC to whole-unit USDT — up to 8 decimals, trimmed of
// trailing zeros so whole-number assets (e.g. USDT) don't show as "48000.00000000".
function formatAmount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 2 });
}
