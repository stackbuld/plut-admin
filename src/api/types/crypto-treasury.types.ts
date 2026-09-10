// crypto-service's admin Treasury Reconciliation surface —
// /api/crypto/admin/Treasury/reconciliation*. Same AdminOnly policy + { success, data, message }
// envelope as every other admin fetcher here (see src/api/client.ts). Shapes verified against
// docs/wallet-service-docs/crypto-wallet/admin-console/10-TREASURY_RECONCILIATION.md §3.
//
// The screen this powers answers one question: do Plut's own wallet balances, Formance's
// aggregate custody account, and Binance's live sub-account balances agree, per asset? A snapshot
// is persisted server-side so the dashboard has something to show without re-querying Binance on
// every page load — "Run now" is an explicit, rate-limited action that computes a fresh one.

export type TreasuryReconciliationStatus = "Matched" | "Drift";

export type TreasuryAssetReconciliation = {
  asset: string;
  plutWalletsSum: number;
  formanceCustodyTotal: number;
  binanceLiveSum: number;
  delta: number;
  status: TreasuryReconciliationStatus;
};

// -- GET /api/crypto/admin/Treasury/reconciliation ----------------------------
// Returns the last persisted snapshot — never triggers a computation itself.
// hasRun=false means reconciliation has never been computed (computedAt/assets are null) — a
// first-run/empty state, not an error.

export type TreasuryReconciliationSnapshotDto = {
  hasRun: boolean;
  computedAt: string | null;
  assets: TreasuryAssetReconciliation[] | null;
  totalActiveSubAccounts: number;
  subAccountsChecked: number;
  subAccountsFailed: number;
};

// -- POST /api/crypto/admin/Treasury/reconciliation/run -----------------------
// No body. 200 with a fresh TreasuryReconciliationSnapshotDto on success. 422 if rate-limited
// (CRYPTO_TREASURY_RECONCILIATION_TOO_SOON — a run happened too recently, backend enforces a
// minimum cooldown) or if the run itself failed to finish in its time budget
// (CRYPTO_TREASURY_RECONCILIATION_TIMED_OUT). Per src/api/client.ts's request(), the thrown
// Error's `message` is the raw error code string in both cases — match on that, not on prose.
export const CRYPTO_TREASURY_RECONCILIATION_TOO_SOON = "CRYPTO_TREASURY_RECONCILIATION_TOO_SOON";
export const CRYPTO_TREASURY_RECONCILIATION_TIMED_OUT = "CRYPTO_TREASURY_RECONCILIATION_TIMED_OUT";

// -- GET /api/crypto/admin/Treasury/reconciliation/{asset}/breakdown ----------
// Live, on-demand per-sub-account drill-down for one asset — NOT derived from the persisted
// snapshot, so it can be called at any time and reflects Binance's state at call time. Used when a
// top-level asset row shows "Drift" and an admin wants to find which specific sub-account(s) are
// off (an aggregate match can still hide individual sub-accounts offsetting each other).

export type TreasurySubAccountBreakdownRow = {
  userId: string;
  exchangeSubAccountId: string;
  plutWalletBalance: number;
  binanceBalance: number;
  delta: number;
};
