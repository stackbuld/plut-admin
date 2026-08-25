import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  AdminCryptoSubAccountDetail,
  AdminCryptoSubAccountSummary,
  CryptoKycAdequacyResult,
  CryptoSubAccountRetryResult,
  ListCryptoSubAccountsParams,
} from "./types/crypto.types";
import type { PagedResult } from "./types";

// crypto-service's admin sub-account/KYC-sharing surface — /api/crypto/admin/CryptoSubAccounts/*,
// same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). Not covered by an idempotency-key middleware allow-list (same as
// Withdrawals/wallets-admin), so retryKycShare doesn't send one — unlike VAS's admin mutations.
const BASE = "/api/crypto/admin/CryptoSubAccounts";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listCryptoSubAccounts = (p: ListCryptoSubAccountsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.kycShareStatus) params.kycShareStatus = p.kycShareStatus;
  if (p.page) params.page = p.page;
  if (p.pageSize) params.pageSize = p.pageSize;
  return apiGet<PagedResult<AdminCryptoSubAccountSummary>>(`${BASE}${buildQs(params)}`);
};

/** 404 (CRYPTO_SUBACCOUNT_NOT_FOUND) is a normal, expected state — a user whose provisioning
 * attempt failed before a sub-account row was ever created. Callers should check for that error
 * code rather than treating every failure here as a crash-worthy state. */
export const getCryptoSubAccount = (userId: string) =>
  apiGet<AdminCryptoSubAccountDetail>(`${BASE}/${userId}`);

export const getCryptoKycAdequacy = (userId: string) =>
  apiGet<CryptoKycAdequacyResult>(`${BASE}/${userId}/kyc-adequacy`);

/** Safe to call whether provisioning is stuck/failed or already fully complete (a no-op returning
 * the existing row unchanged in the latter case) — no need to distinguish those cases client-side. */
export const retryCryptoKycShare = (userId: string) =>
  apiPost<CryptoSubAccountRetryResult>(`${BASE}/${userId}/retry-kyc-share`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoKeys = {
  all: () => ["admin", "crypto", "subaccounts"] as const,
  lists: () => [...cryptoKeys.all(), "list"] as const,
  list: (params?: ListCryptoSubAccountsParams) => [...cryptoKeys.lists(), params] as const,
  detail: (userId: string) => [...cryptoKeys.all(), userId] as const,
  adequacy: (userId: string) => [...cryptoKeys.all(), userId, "kyc-adequacy"] as const,
};

export const cryptoQueries = {
  list: (params?: ListCryptoSubAccountsParams) =>
    queryOptions({
      queryKey: cryptoKeys.list(params),
      queryFn: () => listCryptoSubAccounts(params),
      staleTime: 15_000,
    }),

  detail: (userId: string) =>
    queryOptions<AdminCryptoSubAccountDetail>({
      queryKey: cryptoKeys.detail(userId),
      queryFn: () => getCryptoSubAccount(userId),
      staleTime: 15_000,
      // A 404 here is CRYPTO_SUBACCOUNT_NOT_FOUND, a normal state (not a transient failure) — don't
      // burn 3 retries on it before the "no sub-account yet" empty state can render.
      retry: false,
    }),

  adequacy: (userId: string) =>
    queryOptions<CryptoKycAdequacyResult>({
      queryKey: cryptoKeys.adequacy(userId),
      queryFn: () => getCryptoKycAdequacy(userId),
      staleTime: 15_000,
    }),
};
