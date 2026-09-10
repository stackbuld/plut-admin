// crypto-service admin System Health surface — /api/crypto/admin/SystemHealth/workers.
// Same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). Shape verified against
// docs/wallet-service-docs/crypto-wallet/admin-console/12-SYSTEM_HEALTH.md §3.
//
// Always exactly 5 rows, always in this fixed order: Deposit Sync, Withdrawal Status Sync,
// Withdrawal Submission, Wallet Activation Dispatch, Binance KYC Reconciliation.

export type CryptoWorkerHealthStatus = "Healthy" | "Degraded" | "Stalled" | "Disabled";

export type CryptoWorkerHealthDto = {
  name: string;
  status: CryptoWorkerHealthStatus;
  /** ISO datetime, or null when the worker has never recorded a run yet, or is Disabled. */
  lastRunAt: string | null;
  /** Human-readable explanation — shown whenever present, especially for Degraded/Stalled rows. */
  detail: string | null;
};
