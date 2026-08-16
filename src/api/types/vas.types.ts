export type VasTransactionStatus =
  | "Initiated"
  | "PendingProvider"
  | "PendingValidation"
  | "Successful"
  | "Failed"
  | "Refunded"
  | "Reversed"
  | "PendingResolution";

export type VasProviderHealthStatus = "Healthy" | "Degraded" | "Unhealthy" | "Maintenance";

// Returned by GET /api/vas/admin/transactions (list)
export type VasAdminTransaction = {
  id: string;
  reference: string;
  userId: string;
  serviceCategoryId: string;
  amount: number;
  currencyCode: string;
  status: VasTransactionStatus;
  customerIdentifierValue: string;
  created: string;
  completedAt: string | null;
  commissionEarned: number | null;
};

export type ListVasTransactionsParams = {
  userId?: string;
  status?: VasTransactionStatus | "All";
  serviceCategoryId?: string;
  reference?: string;
  beneficiary?: string;
  from?: string;
  to?: string;
  scheduledTransactionId?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type VasTransactionCommission = {
  commissionEarned: number;
  netPayableToProvider: number;
  currencyCode: string;
};

export type VasTransactionFulfillment = {
  fulfillmentType: string;
  tokenCode: string | null;
  tokenAmount: number | null;
  units: string | null;
  receiptNumber: string | null;
  receiptUrl: string | null;
  providerMessage: string | null;
  validatedAt: string | null;
  expiresAt: string | null;
};

export type VasProviderTransactionLog = {
  id: string;
  logType: string;
  endpoint: string;
  httpMethod: string;
  requestPayload: string | null;
  responseStatusCode: number | null;
  responsePayload: string | null;
  responseLatencyMs: number;
  isSuccess: boolean | null;
  providerErrorCode: string | null;
  providerErrorMessage: string | null;
  retryAttempt: number;
};

// Returned by GET /api/vas/admin/transactions/{id} (detail)
export type VasAdminTransactionDetail = {
  id: string;
  transactionReference: string;
  userId: string;
  businessId: string | null;
  serviceCategoryId: string;
  serviceCode: string;
  serviceId: string;
  serviceProductId: string | null;
  customerIdentifierType: string;
  customerIdentifierValue: string;
  customerName: string | null;
  amount: number;
  currencyCode: string;
  feeAmount: number | null;
  feeCurrencyCode: string | null;
  status: VasTransactionStatus;
  providerId: string;
  providerName: string | null;
  providerCode: string | null;
  providerServiceMappingId: string;
  providerProductMappingId: string | null;
  providerTransactionReference: string | null;
  providerExternalReference: string | null;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  walletDebitTransactionId: string | null;
  walletLedgerTxId: string | null;
  walletSettlementReference: string | null;
  initiatedAt: string;
  providerCalledAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  refundedAt: string | null;
  commission: VasTransactionCommission | null;
  fulfillment: VasTransactionFulfillment | null;
  providerLogs: VasProviderTransactionLog[];
};

// Returned by GET /api/vas/admin/dashboard
export type VasDashboardProvider = {
  code: string;
  status: VasProviderHealthStatus;
  currentSuccessRate: number | null;
  isActive: boolean;
};

export type VasDashboard = {
  transactionsLast24h: number;
  successfulLast24h: number;
  failedLast24h: number;
  successRatePercent: number;
  volumeLast24h: number;
  providers: VasDashboardProvider[];
};

// Returned by GET /api/vas/admin/providers (list) and .../providers/{id} (detail)
export type VasAdminProvider = {
  id: string;
  name: string;
  code: string;
  status: VasProviderHealthStatus;
  priority: number;
  isActive: boolean;
  currentSuccessRate: number | null;
  lastHealthCheckAt: string | null;
  supportedCategories: string | null;
};

export type UpdateVasProviderBody = {
  id?: string;
  priority?: number;
  isActive?: boolean;
  supportedCategories?: string;
};

// Returned by GET /api/vas/admin/providers/{id}/mapping-summary
export type VasCategoryMappingCount = {
  serviceCategoryId: string;
  activeServiceMappings: number;
  retiredServiceMappings: number;
  activeProductMappings: number;
  retiredProductMappings: number;
};

export type VasProviderMappingSummary = {
  providerId: string;
  categories: VasCategoryMappingCount[];
  totalActiveServiceMappings: number;
  totalRetiredServiceMappings: number;
  totalActiveProductMappings: number;
  totalRetiredProductMappings: number;
};

// Returned by GET /api/vas/admin/security-flags
export type VasSecurityFlag = {
  id: string;
  userId: string;
  reason: string;
  flaggedAt: string;
  flaggedUntil: string;
  isActive: boolean;
};

export type ListVasSecurityFlagsParams = {
  activeOnly?: boolean;
  from?: string;
  to?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type SwitchVasProviderBody = {
  newProviderId: string;
};
