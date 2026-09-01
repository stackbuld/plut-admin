// crypto-service admin Liquidation Pool & Reconciliation — /api/crypto/admin/Liquidation, same
// AdminOnly policy + { success, data, message } envelope as every other admin fetcher here (see
// src/api/client.ts). See
// docs/wallet-service-docs/crypto-wallet/admin-console/15-SELL_ORDERS_AND_LIQUIDATION.md §3 Part B.
//
// The 2026-08-29 Sell redesign sweeps crypto to Binance master instead of trading it — this pool
// is what accumulates there, waiting for an admin to sell it OTC and record the result here.

export const DEFAULT_LIQUIDATION_PROVIDER = "plut_manual";

// ── GET /api/crypto/admin/Liquidation/pool?provider= ────────────────────────

export type LiquidationPoolRowDto = {
  asset: string;
  pendingLiquidation: number;
  lastReconciledAt: string | null;
};

// ── GET /api/crypto/admin/Liquidation/history?provider=&page=&pageSize= ─────

export type LiquidationHistoryRowDto = {
  batchId: string;
  asset: string;
  soldQuantity: number;
  fiatCurrency: string;
  fiatProceedsMinor: number;
  bankAccount: string;
  notes: string | null;
  adminEmail: string;
  /** Always false today — clearing the matching fiat receivable needs a `wallets` admin capability
   * that doesn't exist yet. See the backend's ReconcileLiquidationBatchCommand doc-comment. */
  fiatClearingCompleted: boolean;
  createdAt: string;
};

export type PagedLiquidationHistoryDto = {
  items: LiquidationHistoryRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
};

// ── POST /api/crypto/admin/Liquidation/reconcile ────────────────────────────

export type ReconcileLiquidationRequest = {
  asset: string;
  soldQuantity: number;
  fiatCurrency: string;
  fiatProceedsMinor: number;
  bankAccount: string;
  notes?: string;
  provider?: string;
};
