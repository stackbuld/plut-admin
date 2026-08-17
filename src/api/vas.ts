import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, buildQs, idempotencyHeader } from "./client";
import type {
  ListVasSecurityFlagsParams,
  ListVasTransactionsParams,
  SwitchVasProviderBody,
  UpdateVasProviderBody,
  VasAdminProvider,
  VasAdminTransaction,
  VasAdminTransactionDetail,
  VasDashboard,
  VasProviderMappingSummary,
  VasSecurityFlag,
} from "./types/vas.types";
import type { PagedResult } from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const fetchVasDashboard = (): Promise<VasDashboard> =>
  apiGet<VasDashboard>("/api/vas/admin/dashboard");

export const listVasTransactions = (p: ListVasTransactionsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.userId) params.UserId = p.userId;
  if (p.status && p.status !== "All") params.Status = p.status;
  if (p.serviceCategoryId) params.ServiceCategoryId = p.serviceCategoryId;
  if (p.reference) params.Reference = p.reference;
  if (p.beneficiary) params.Beneficiary = p.beneficiary;
  if (p.from) params.From = p.from;
  if (p.to) params.To = p.to;
  if (p.scheduledTransactionId) params.ScheduledTransactionId = p.scheduledTransactionId;
  params.PageNumber = p.pageNumber ?? 1;
  params.PageSize = p.pageSize ?? 20;
  return apiGet<PagedResult<VasAdminTransaction>>(`/api/vas/admin/transactions${buildQs(params)}`);
};

export const getVasTransaction = (id: string) =>
  apiGet<VasAdminTransactionDetail>(`/api/vas/admin/transactions/${id}`);

export const retryVasTransaction = (id: string) =>
  apiPost<void>(`/api/vas/admin/transactions/${id}/retry`, undefined, idempotencyHeader());

export const switchVasTransactionProvider = (id: string, body: SwitchVasProviderBody) =>
  apiPost<void>(`/api/vas/admin/transactions/${id}/switch-provider`, body, idempotencyHeader());

export const forceRefundVasTransaction = (id: string) =>
  apiPost<void>(`/api/vas/admin/transactions/${id}/force-refund`, undefined, idempotencyHeader());

export const listVasProviders = () => apiGet<VasAdminProvider[]>("/api/vas/admin/providers");

export const getVasProvider = (id: string) =>
  apiGet<VasAdminProvider>(`/api/vas/admin/providers/${id}`);

export const getVasProviderMappingSummary = (id: string) =>
  apiGet<VasProviderMappingSummary>(`/api/vas/admin/providers/${id}/mapping-summary`);

export const updateVasProvider = (id: string, body: UpdateVasProviderBody) =>
  apiPatch<void>(`/api/vas/admin/providers/${id}`, body, idempotencyHeader());

export const syncVasProviders = () =>
  apiPost<void>("/api/vas/admin/providers/sync", undefined, idempotencyHeader());

export const listVasSecurityFlags = (p: ListVasSecurityFlagsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.activeOnly) params.ActiveOnly = p.activeOnly;
  if (p.from) params.From = p.from;
  if (p.to) params.To = p.to;
  params.PageNumber = p.pageNumber ?? 1;
  params.PageSize = p.pageSize ?? 20;
  return apiGet<PagedResult<VasSecurityFlag>>(`/api/vas/admin/security-flags${buildQs(params)}`);
};

// ── Query keys & options ─────────────────────────────────────────────────────

export const vasKeys = {
  all: () => ["admin", "vas"] as const,
  dashboard: () => [...vasKeys.all(), "dashboard"] as const,
  transactions: () => [...vasKeys.all(), "transactions"] as const,
  transactionList: (params?: ListVasTransactionsParams) =>
    [...vasKeys.transactions(), "list", params] as const,
  transactionDetail: (id: string) => [...vasKeys.transactions(), id] as const,
  providers: () => [...vasKeys.all(), "providers"] as const,
  providerList: () => [...vasKeys.providers(), "list"] as const,
  providerDetail: (id: string) => [...vasKeys.providers(), id] as const,
  providerMappingSummary: (id: string) => [...vasKeys.providers(), id, "mapping-summary"] as const,
  securityFlags: () => [...vasKeys.all(), "security-flags"] as const,
  securityFlagList: (params?: ListVasSecurityFlagsParams) =>
    [...vasKeys.securityFlags(), "list", params] as const,
};

export const vasQueries = {
  dashboard: () =>
    queryOptions({
      queryKey: vasKeys.dashboard(),
      queryFn: fetchVasDashboard,
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),

  transactionList: (params?: ListVasTransactionsParams) =>
    queryOptions({
      queryKey: vasKeys.transactionList(params),
      queryFn: () => listVasTransactions(params),
      staleTime: 15_000,
    }),

  transactionDetail: (id: string) =>
    queryOptions<VasAdminTransactionDetail>({
      queryKey: vasKeys.transactionDetail(id),
      queryFn: () => getVasTransaction(id),
      staleTime: 15_000,
    }),

  providerList: () =>
    queryOptions({
      queryKey: vasKeys.providerList(),
      queryFn: listVasProviders,
      staleTime: 15_000,
    }),

  providerDetail: (id: string) =>
    queryOptions<VasAdminProvider>({
      queryKey: vasKeys.providerDetail(id),
      queryFn: () => getVasProvider(id),
      staleTime: 15_000,
    }),

  providerMappingSummary: (id: string) =>
    queryOptions<VasProviderMappingSummary>({
      queryKey: vasKeys.providerMappingSummary(id),
      queryFn: () => getVasProviderMappingSummary(id),
      staleTime: 15_000,
    }),

  securityFlagList: (params?: ListVasSecurityFlagsParams) =>
    queryOptions({
      queryKey: vasKeys.securityFlagList(params),
      queryFn: () => listVasSecurityFlags(params),
      staleTime: 15_000,
    }),
};
