// crypto-service admin Revenue Report — /api/crypto/admin/Revenue, same AdminOnly policy +
// { success, data, message } envelope as every other admin fetcher here (see src/api/client.ts).
// See docs/wallet-service-docs/crypto-wallet/admin-console/11-REVENUE_REPORTS.md.
//
// Two independent, additive revenue mechanisms are tracked separately rather than collapsed into
// one number: "spread" (market-maker markup on Buy/Sell/Swap) vs "platformFee" (explicit service
// charge, chargeable on Withdrawal/Buy/Sell/Swap) — see 06-FEE_AND_SPREAD_RULES.md. All figures are
// USD-equivalent, aggregated from CryptoTransaction.SpreadFee/PlatformFeeUsdEquivalent.

// ── GET /api/crypto/admin/Revenue?from=&to= ─────────────────────────────────
// Both optional — the backend defaults to the last 7 days when omitted.

export type GetCryptoRevenueParams = {
  /** ISO date/datetime string. */
  from?: string;
  /** ISO date/datetime string. */
  to?: string;
};

/**
 * `operationType` is grouped server-side from `CryptoTransaction.Type` (Withdrawal/Buy/Sell/Swap
 * today), not the finer-grained `CryptoFeeRule.OperationType` enum (which also has
 * BuySpread/SellSpread/SwapSpread) — kept as a plain string rather than a strict union so an
 * unexpected value from the backend degrades gracefully instead of a type error.
 */
export type CryptoRevenueOperationBreakdown = {
  operationType: string;
  spread: number;
  platformFee: number;
};

export type CryptoRevenueAssetBreakdown = {
  asset: string;
  /** USD-equivalent total across both spread + platform fee for this asset. */
  total: number;
};

export type CryptoRevenueDailyPoint = {
  /** Plain date string, e.g. "2026-08-21" — no time component. */
  date: string;
  spread: number;
  platformFee: number;
};

export type CryptoRevenueReportDto = {
  from: string;
  to: string;
  totalSpread: number;
  totalPlatformFee: number;
  byOperation: CryptoRevenueOperationBreakdown[];
  byAsset: CryptoRevenueAssetBreakdown[];
  dailySeries: CryptoRevenueDailyPoint[];
};
