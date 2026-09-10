// crypto-service admin wallets surface — /api/crypto/admin/Wallets (same AdminOnly policy + the
// { success, data, message } envelope as every other admin fetcher in this app — see
// src/api/client.ts). Shapes per
// docs/wallet-service-docs/crypto-wallet/admin-console/02-WALLETS_AND_USERS.md §3.

/** CryptoWalletStatus — mirrors CryptoSubAccountStatus's vocabulary but is a wallet-level, Plut-side
 * hold (Frozen/Suspended here do NOT call the Binance-side sub-account freeze
 * (`ICryptoSubAccountProvider.FreezeSubAccountAsync`) — that's a separate, provider-level action
 * this screen does not need, per 02-WALLETS_AND_USERS.md §4). */
export type CryptoWalletStatus = "Active" | "Frozen" | "Suspended" | "Closed";

// ── GET /api/crypto/admin/Wallets?userId={guid} ─────────────────────────────

export type AdminCryptoWalletDto = {
  id: string;
  userId: string;
  asset: string;
  assetFullName: string;
  assetLogoUrl: string | null;
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  status: CryptoWalletStatus;
  isDefault: boolean;
};

export type ListCryptoWalletsParams = {
  userId: string;
};

// ── POST /api/crypto/admin/Wallets/{walletId}/freeze ────────────────────────
// Deposits remain allowed by default; withdrawals and trades are blocked. Reversible via unfreeze.

export type FreezeCryptoWalletBody = {
  reason: string;
  allowDeposits?: boolean;
};

// ── POST /api/crypto/admin/Wallets/{walletId}/suspend ───────────────────────
// All operations blocked, including deposits — fraud/KYC-failure tool, not a routine compliance hold.

export type SuspendCryptoWalletBody = {
  reason: string;
};
