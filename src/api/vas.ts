import { queryOptions } from "@tanstack/react-query";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  buildQs,
  getAdminUserId,
  idempotencyHeader,
} from "./client";
import type {
  CreateVasCommissionBody,
  ListVasBulkBatchesParams,
  ListVasCommissionsParams,
  ListVasSchedulesParams,
  ListVasSecurityFlagsParams,
  ListVasTransactionsParams,
  SwitchVasProviderBody,
  UpdateVasCategoryBody,
  UpdateVasCommissionBody,
  UpdateVasProductBody,
  UpdateVasProviderBody,
  UpdateVasServiceBody,
  VasAdminCategory,
  VasAdminProduct,
  VasAdminProvider,
  VasAdminService,
  VasAdminTransaction,
  VasAdminTransactionDetail,
  VasBulkBatchDetail,
  VasBulkBatch,
  VasCommission,
  VasDashboard,
  VasEmployeeGroup,
  VasEmployeeGroupDetail,
  VasProfitReport,
  VasProviderMappingSummary,
  VasSchedule,
  VasScheduleDetail,
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

// ── Commissions ───────────────────────────────────────────────────────────────

export const listVasCommissions = (p: ListVasCommissionsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.providerId) params.ProviderId = p.providerId;
  if (p.isActive !== undefined) params.IsActive = p.isActive;
  return apiGet<VasCommission[]>(`/api/vas/admin/commissions${buildQs(params)}`);
};

export const createVasCommission = (body: Omit<CreateVasCommissionBody, "adminUserId">) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  return apiPost<string>(
    "/api/vas/admin/commissions",
    { ...body, adminUserId },
    idempotencyHeader(),
  );
};

export const updateVasCommission = (id: string, body: UpdateVasCommissionBody) =>
  apiPatch<void>(`/api/vas/admin/commissions/${id}`, body, idempotencyHeader());

export const deactivateVasCommission = (id: string) =>
  apiDelete<void>(`/api/vas/admin/commissions/${id}`, undefined, idempotencyHeader());

export const getVasProfitReport = (from: string, to: string) =>
  apiGet<VasProfitReport>(
    `/api/vas/admin/commissions/profit-report${buildQs({ From: from, To: to })}`,
  );

// ── Bulk Purchases (read-only oversight) ────────────────────────────────────────

export const listVasBulkBatches = (p: ListVasBulkBatchesParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.businessId) params.BusinessId = p.businessId;
  if (p.status) params.Status = p.status;
  if (p.from) params.From = p.from;
  if (p.to) params.To = p.to;
  params.PageNumber = p.pageNumber ?? 1;
  params.PageSize = p.pageSize ?? 20;
  return apiGet<PagedResult<VasBulkBatch>>(`/api/vas/admin/bulk-batches${buildQs(params)}`);
};

export const getVasBulkBatch = (id: string) =>
  apiGet<VasBulkBatchDetail>(`/api/vas/admin/bulk-batches/${id}`);

// ── Employee Groups (read-only oversight) ───────────────────────────────────────

export const listVasEmployeeGroups = (businessId?: string) =>
  apiGet<VasEmployeeGroup[]>(`/api/vas/admin/employee-groups${buildQs({ businessId })}`);

export const getVasEmployeeGroup = (id: string) =>
  apiGet<VasEmployeeGroupDetail>(`/api/vas/admin/employee-groups/${id}`);

// ── Schedules (read-only oversight) ─────────────────────────────────────────────

export const listVasSchedules = (p: ListVasSchedulesParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.userId) params.UserId = p.userId;
  if (p.isActive !== undefined) params.IsActive = p.isActive;
  if (p.service) params.Service = p.service;
  params.PageNumber = p.pageNumber ?? 1;
  params.PageSize = p.pageSize ?? 20;
  return apiGet<PagedResult<VasSchedule>>(`/api/vas/admin/schedules${buildQs(params)}`);
};

export const getVasSchedule = (id: string) =>
  apiGet<VasScheduleDetail>(`/api/vas/admin/schedules/${id}`);

// ── Catalog (read-heavy, narrow writes) ─────────────────────────────────────────

export const listVasCategories = () => apiGet<VasAdminCategory[]>("/api/vas/admin/categories");

export const updateVasCategory = (id: string, body: UpdateVasCategoryBody) =>
  apiPatch<void>(`/api/vas/admin/categories/${id}`, body, idempotencyHeader());

export const listVasServices = (categoryId?: string) =>
  apiGet<VasAdminService[]>(`/api/vas/admin/services${buildQs({ categoryId })}`);

export const updateVasService = (id: string, body: UpdateVasServiceBody) =>
  apiPatch<void>(`/api/vas/admin/services/${id}`, body, idempotencyHeader());

export const listVasProducts = (serviceId: string) =>
  apiGet<VasAdminProduct[]>(`/api/vas/admin/services/${serviceId}/products`);

export const updateVasProduct = (id: string, body: UpdateVasProductBody) =>
  apiPatch<void>(`/api/vas/admin/products/${id}`, body, idempotencyHeader());

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
  commissions: () => [...vasKeys.all(), "commissions"] as const,
  commissionList: (params?: ListVasCommissionsParams) =>
    [...vasKeys.commissions(), "list", params] as const,
  profitReport: (from: string, to: string) =>
    [...vasKeys.commissions(), "profit-report", from, to] as const,
  bulkBatches: () => [...vasKeys.all(), "bulk-batches"] as const,
  bulkBatchList: (params?: ListVasBulkBatchesParams) =>
    [...vasKeys.bulkBatches(), "list", params] as const,
  bulkBatchDetail: (id: string) => [...vasKeys.bulkBatches(), id] as const,
  employeeGroups: () => [...vasKeys.all(), "employee-groups"] as const,
  employeeGroupList: (businessId?: string) =>
    [...vasKeys.employeeGroups(), "list", businessId] as const,
  employeeGroupDetail: (id: string) => [...vasKeys.employeeGroups(), id] as const,
  schedules: () => [...vasKeys.all(), "schedules"] as const,
  scheduleList: (params?: ListVasSchedulesParams) =>
    [...vasKeys.schedules(), "list", params] as const,
  scheduleDetail: (id: string) => [...vasKeys.schedules(), id] as const,
  catalog: () => [...vasKeys.all(), "catalog"] as const,
  categoryList: () => [...vasKeys.catalog(), "categories"] as const,
  serviceList: (categoryId?: string) => [...vasKeys.catalog(), "services", categoryId] as const,
  productList: (serviceId: string) => [...vasKeys.catalog(), "products", serviceId] as const,
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

  commissionList: (params?: ListVasCommissionsParams) =>
    queryOptions({
      queryKey: vasKeys.commissionList(params),
      queryFn: () => listVasCommissions(params),
      staleTime: 15_000,
    }),

  profitReport: (from: string, to: string) =>
    queryOptions({
      queryKey: vasKeys.profitReport(from, to),
      queryFn: () => getVasProfitReport(from, to),
      staleTime: 15_000,
    }),

  bulkBatchList: (params?: ListVasBulkBatchesParams) =>
    queryOptions({
      queryKey: vasKeys.bulkBatchList(params),
      queryFn: () => listVasBulkBatches(params),
      staleTime: 15_000,
    }),

  bulkBatchDetail: (id: string) =>
    queryOptions<VasBulkBatchDetail>({
      queryKey: vasKeys.bulkBatchDetail(id),
      queryFn: () => getVasBulkBatch(id),
      staleTime: 15_000,
    }),

  employeeGroupList: (businessId?: string) =>
    queryOptions({
      queryKey: vasKeys.employeeGroupList(businessId),
      queryFn: () => listVasEmployeeGroups(businessId),
      staleTime: 15_000,
    }),

  employeeGroupDetail: (id: string) =>
    queryOptions<VasEmployeeGroupDetail>({
      queryKey: vasKeys.employeeGroupDetail(id),
      queryFn: () => getVasEmployeeGroup(id),
      staleTime: 15_000,
    }),

  scheduleList: (params?: ListVasSchedulesParams) =>
    queryOptions({
      queryKey: vasKeys.scheduleList(params),
      queryFn: () => listVasSchedules(params),
      staleTime: 15_000,
    }),

  scheduleDetail: (id: string) =>
    queryOptions<VasScheduleDetail>({
      queryKey: vasKeys.scheduleDetail(id),
      queryFn: () => getVasSchedule(id),
      staleTime: 15_000,
    }),

  categoryList: () =>
    queryOptions({
      queryKey: vasKeys.categoryList(),
      queryFn: listVasCategories,
      staleTime: 15_000,
    }),

  serviceList: (categoryId?: string) =>
    queryOptions({
      queryKey: vasKeys.serviceList(categoryId),
      queryFn: () => listVasServices(categoryId),
      staleTime: 15_000,
    }),

  productList: (serviceId: string) =>
    queryOptions({
      queryKey: vasKeys.productList(serviceId),
      queryFn: () => listVasProducts(serviceId),
      staleTime: 15_000,
      enabled: !!serviceId,
    }),
};
