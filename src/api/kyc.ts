import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  GetKycAdminCasesResult,
  GetKycCaseDetailResult,
  GetKycStatsResult,
  ListKycAdminCasesParams,
  ResetKycCaseResult,
  SyncKycPersonalInfoResult,
} from "./types/kyc.types";

// account-service's admin KYC surface — /api/v1/admin/kyc/*, a different backend/prefix scheme from
// VAS (/api/vas/admin) and Wallets (/api/admin). No idempotency-key requirement here (unlike VAS's
// admin mutations) — account-service's KYC admin routes don't have that middleware wired.
const BASE = "/api/v1/admin/kyc";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listKycCases = (p: ListKycAdminCasesParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.status) params.status = p.status;
  if (p.tier) params.tier = p.tier;
  if (p.type) params.type = p.type;
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  if (p.search) params.search = p.search;
  params.page = p.page ?? 1;
  params.pageSize = p.pageSize ?? 20;
  return apiGet<GetKycAdminCasesResult>(`${BASE}/cases${buildQs(params)}`);
};

export const getKycStats = () => apiGet<GetKycStatsResult>(`${BASE}/stats`);

export const getKycCase = (caseId: string) => apiGet<GetKycCaseDetailResult>(`${BASE}/${caseId}`);

/** Resyncs exactly this case — re-fetches from the provider and upserts, even if already synced. */
export const syncKycCase = (kycCaseId: string) =>
  apiPost<SyncKycPersonalInfoResult>(`${BASE}/sync-personal-info`, { kycCaseId });

/** Backfills every approved User-type case that has never been synced. Does NOT force-resync already-synced cases. */
export const syncAllUnsyncedKyc = () =>
  apiPost<SyncKycPersonalInfoResult>(`${BASE}/sync-personal-info`, {});

/**
 * Resets an Approved User-type case: clears its documents, wipes the user's synced personal info,
 * and downgrades them to Tier0 so they can redo verification from scratch. Only Approved cases are
 * eligible — irreversible, requires a reason.
 */
export const resetKycCase = (caseId: string, reason: string) =>
  apiPost<ResetKycCaseResult>(`${BASE}/${caseId}/reset`, { reason });

// ── Query keys & options ─────────────────────────────────────────────────────

export const kycKeys = {
  all: () => ["admin", "kyc"] as const,
  stats: () => [...kycKeys.all(), "stats"] as const,
  cases: () => [...kycKeys.all(), "cases"] as const,
  caseList: (params?: ListKycAdminCasesParams) => [...kycKeys.cases(), "list", params] as const,
  caseDetail: (caseId: string) => [...kycKeys.cases(), caseId] as const,
};

export const kycQueries = {
  stats: () =>
    queryOptions({
      queryKey: kycKeys.stats(),
      queryFn: getKycStats,
      staleTime: 15_000,
    }),

  caseList: (params?: ListKycAdminCasesParams) =>
    queryOptions({
      queryKey: kycKeys.caseList(params),
      queryFn: () => listKycCases(params),
      staleTime: 15_000,
    }),

  caseDetail: (caseId: string) =>
    queryOptions<GetKycCaseDetailResult>({
      queryKey: kycKeys.caseDetail(caseId),
      queryFn: () => getKycCase(caseId),
      staleTime: 15_000,
    }),
};
