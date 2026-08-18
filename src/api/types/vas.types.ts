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

// ── Commissions (admin design 05) ──────────────────────────────────────────────

export type CommissionType = "Percentage" | "FixedAmount" | "Tiered";

export type VasCommission = {
  id: string;
  providerId: string;
  serviceId: string | null;
  serviceProductId: string | null;
  commissionType: CommissionType;
  ratePercent: number | null;
  fixedAmount: number | null;
  currencyCode: string;
  minTransactionAmount: number | null;
  maxTransactionAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  priority: number;
};

export type ListVasCommissionsParams = {
  providerId?: string;
  isActive?: boolean;
};

export type CreateVasCommissionBody = {
  providerId: string;
  currencyCode: string;
  commissionType: CommissionType;
  adminUserId: string;
  ratePercent?: number;
  fixedAmount?: number;
  serviceId?: string;
  serviceProductId?: string;
  minTransactionAmount?: number;
  maxTransactionAmount?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  priority?: number;
};

export type UpdateVasCommissionBody = {
  ratePercent?: number;
  fixedAmount?: number;
  minTransactionAmount?: number;
  maxTransactionAmount?: number;
  effectiveTo?: string;
  priority?: number;
  isActive?: boolean;
};

export type VasCategoryProfit = {
  serviceCategory: string;
  commissionEarned: number;
  transactionCount: number;
};

export type VasProfitReport = {
  from: string;
  to: string;
  totalCommissionEarned: number;
  transactionCount: number;
  byCategory: VasCategoryProfit[];
};

// ── Bulk Purchases (admin design 06, read-only oversight) ──────────────────────

export type BulkPurchaseStatus =
  | "PendingApproval"
  | "Pending"
  | "Validating"
  | "Processing"
  | "PartiallyCompleted"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type VasBulkBatch = {
  id: string;
  batchReference: string | null;
  batchName: string;
  status: BulkPurchaseStatus;
  totalItemCount: number;
  successCount: number;
  failureCount: number;
  totalEstimatedAmount: number;
  currencyCode: string;
  createdAt: string;
};

export type ListVasBulkBatchesParams = {
  businessId?: string;
  status?: BulkPurchaseStatus;
  from?: string;
  to?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type VasBulkBatchItem = {
  lineNumber: number;
  serviceCategoryId: string;
  serviceId: string;
  customerIdentifierValue: string;
  amount: number;
  status: string;
  vasTransactionId: string | null;
  errorMessage: string | null;
};

export type VasBulkBatchDetail = {
  batch: VasBulkBatch;
  items: VasBulkBatchItem[];
};

// ── Employee Groups (admin design 07, read-only oversight) ─────────────────────

export type AllowanceFrequency = "Weekly" | "Monthly";

export type VasEmployeeGroup = {
  id: string;
  name: string;
  serviceCategoryId: string;
  serviceId: string;
  serviceProductId: string | null;
  allowanceAmount: number;
  currencyCode: string;
  isActive: boolean;
  activeMemberCount: number;
  allowanceFrequency: AllowanceFrequency | null;
  nextDisbursementDate: string | null;
  lastDisbursedAt: string | null;
};

export type VasEmployeeGroupMember = {
  id: string;
  beneficiaryValue: string;
  memberUserId: string | null;
  isActive: boolean;
};

export type VasEmployeeGroupDetail = {
  group: VasEmployeeGroup;
  members: VasEmployeeGroupMember[];
};

// ── Schedules (admin design 08, read-only oversight) ────────────────────────────

export type ScheduleFrequency = "Daily" | "Weekly" | "BiWeekly" | "Monthly" | "Custom";

export type VasSchedule = {
  id: string;
  userId: string;
  serviceCategoryId: string;
  serviceId: string;
  serviceProductId: string | null;
  customerIdentifierType: string;
  customerIdentifierValue: string;
  amount: number;
  currencyCode: string;
  frequency: string;
  nextRunDate: string;
  lastRunDate: string | null;
  lastRunStatus: string | null;
  endDate: string | null;
  isActive: boolean;
  isCancelled: boolean;
  autoRenew: boolean;
  failureCount: number;
  description: string | null;
  runCount: number;
  nickname: string | null;
  emoji: string | null;
  note: string | null;
  recipientLabel: string | null;
  skipNextRun: boolean;
};

export type ListVasSchedulesParams = {
  userId?: string;
  isActive?: boolean;
  service?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type VasScheduleDetail = {
  schedule: VasSchedule;
  maxFailureCount: number;
  lastReminderAt: string | null;
};

// ── Catalog (admin design 04, read-heavy with narrow writes) ───────────────────

export type VasAdminCategory = {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  defaultCurrencyCode: string;
  requiresCustomerValidation: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  serviceCount: number;
};

export type UpdateVasCategoryBody = {
  isActive?: boolean;
  minAmount?: number;
  maxAmount?: number;
};

export type VasAdminService = {
  id: string;
  serviceCategoryId: string;
  code: string;
  name: string;
  description: string;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  minAmount: number | null;
  maxAmount: number | null;
  productCount: number;
  hasActiveProviderMapping: boolean;
};

export type UpdateVasServiceBody = {
  isActive?: boolean;
  minAmount?: number;
  maxAmount?: number;
};

export type VasAdminMobileDataPlan = {
  dataCode: string;
  validity: string;
  allowance: string;
  allowanceMB: number | null;
  isNightPlan: boolean;
  isSocialPlan: boolean;
};

export type VasAdminCablePricingOption = {
  monthsPaidFor: number;
  price: number;
  invoicePeriod: number;
};

export type VasAdminCableTvPackage = {
  productCode: string;
  isAddon: boolean;
  parentPackageId: string | null;
  availablePricingOptions: VasAdminCablePricingOption[];
};

export type VasAdminProduct = {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description: string | null;
  productType: "FixedAmount" | "VariableAmount" | "SubscriptionPackage";
  baseAmount: number | null;
  currencyCode: string;
  isActive: boolean;
  sortOrder: number;
  hasActiveProviderMapping: boolean;
  dataPlan: VasAdminMobileDataPlan | null;
  cablePackage: VasAdminCableTvPackage | null;
};

export type UpdateVasProductBody = {
  isActive: boolean;
};
