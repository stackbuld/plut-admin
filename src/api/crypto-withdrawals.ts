import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  AdminCryptoWithdrawal,
  ListCryptoWithdrawalsParams,
  RejectCryptoWithdrawalBody,
} from "./types/crypto-withdrawals.types";

// crypto-service's admin withdrawals surface — /api/crypto/admin/Withdrawals, same AdminOnly
// policy + { success, data, message } envelope as every other admin fetcher here (see
// src/api/client.ts). Confirmed against the actual shipped C# endpoint (Web/Endpoints/
// Withdrawals.cs, AdminWithdrawals class) — there is no per-id GET on this admin surface, only
// the flat list + the three action routes below, so the detail route finds a withdrawal by id
// from the already-fetched list query rather than assuming a single-item endpoint exists.
const BASE = "/api/crypto/admin/Withdrawals";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listCryptoWithdrawals = (p: ListCryptoWithdrawalsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.pendingOnly) params.pendingOnly = p.pendingOnly;
  return apiGet<AdminCryptoWithdrawal[]>(`${BASE}${buildQs(params)}`);
};

export const approveCryptoWithdrawal = (withdrawalId: string) =>
  apiPost<void>(`${BASE}/${withdrawalId}/approve`);

export const rejectCryptoWithdrawal = (withdrawalId: string, body: RejectCryptoWithdrawalBody) =>
  apiPost<void>(`${BASE}/${withdrawalId}/reject`, body);

/** Use only for SweepFailed/PendingBroadcast withdrawals — resumes the withdrawal's Binance
 * submission operation at whichever step last failed and updates CryptoWithdrawal.Status
 * accordingly. Not the generic Operations Explorer retry, which has no knowledge of the
 * withdrawal entity and won't update its status. */
export const retryCryptoWithdrawalSubmission = (withdrawalId: string) =>
  apiPost<void>(`${BASE}/${withdrawalId}/retry-submission`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoWithdrawalKeys = {
  all: () => ["admin", "crypto", "withdrawals"] as const,
  lists: () => [...cryptoWithdrawalKeys.all(), "list"] as const,
  list: (params?: ListCryptoWithdrawalsParams) => [...cryptoWithdrawalKeys.lists(), params] as const,
};

export const cryptoWithdrawalQueries = {
  list: (params?: ListCryptoWithdrawalsParams) =>
    queryOptions({
      queryKey: cryptoWithdrawalKeys.list(params),
      queryFn: () => listCryptoWithdrawals(params),
      staleTime: 15_000,
    }),
};
