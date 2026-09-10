import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client";
import type {
  TreasuryReconciliationSnapshotDto,
  TreasurySubAccountBreakdownRow,
} from "./types/crypto-treasury.types";

// crypto-service's admin Treasury Reconciliation surface — /api/crypto/admin/Treasury/reconciliation.
// Same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). Mirrors src/api/crypto-fx-rates.ts's fetcher/query-factory shape, per
// docs/wallet-service-docs/crypto-wallet/admin-console/10-TREASURY_RECONCILIATION.md §3.
const BASE = "/api/crypto/admin/Treasury/reconciliation";

// ── Fetchers ──────────────────────────────────────────────────────────────────

/** Returns the last persisted snapshot — does not trigger a new computation. `hasRun: false`
 * means reconciliation has never run (a first-run empty state, not an error). */
export const getTreasuryReconciliation = () => apiGet<TreasuryReconciliationSnapshotDto>(BASE);

/** Triggers a fresh, live computation across every active sub-account and persists it. No body.
 * 422 (CRYPTO_TREASURY_RECONCILIATION_TOO_SOON) if run too recently — backend enforces a minimum
 * cooldown between runs — or (CRYPTO_TREASURY_RECONCILIATION_TIMED_OUT) if the run itself didn't
 * finish in its time budget. Callers should match `Error.message` against those literal codes. */
export const runTreasuryReconciliation = () =>
  apiPost<TreasuryReconciliationSnapshotDto>(`${BASE}/run`);

/** Live, on-demand per-sub-account breakdown for one asset — queried fresh, not read from the
 * persisted snapshot. Used to drill into a "Drift" row and find which sub-account(s) are off. */
export const getTreasuryReconciliationBreakdown = (asset: string) =>
  apiGet<TreasurySubAccountBreakdownRow[]>(`${BASE}/${encodeURIComponent(asset)}/breakdown`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoTreasuryKeys = {
  all: () => ["admin", "crypto", "treasury"] as const,
  snapshot: () => [...cryptoTreasuryKeys.all(), "snapshot"] as const,
  breakdown: (asset: string) => [...cryptoTreasuryKeys.all(), "breakdown", asset] as const,
};

export const cryptoTreasuryQueries = {
  // Last computed snapshot for the main table — a manual "Run now" action replaces this directly
  // (via setQueryData with the mutation's response) rather than relying on refetch, so staleTime
  // only governs background/cross-navigation refetching, not the post-run update.
  snapshot: () =>
    queryOptions({
      queryKey: cryptoTreasuryKeys.snapshot(),
      queryFn: getTreasuryReconciliation,
      staleTime: 60_000,
    }),

  // Per-asset drill-down, fetched only once an admin expands a "Drift" row. Always live (no
  // staleTime) — the whole point is to reflect Binance's current state, not a cached one.
  breakdown: (asset: string) =>
    queryOptions({
      queryKey: cryptoTreasuryKeys.breakdown(asset),
      queryFn: () => getTreasuryReconciliationBreakdown(asset),
      staleTime: 0,
    }),
};
