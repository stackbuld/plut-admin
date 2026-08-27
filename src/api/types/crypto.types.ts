// crypto-service admin API — Binance sub-account provisioning + KYC sharing.
// Routes live under /api/crypto/admin/CryptoSubAccounts (same AdminOnly policy, same envelope
// convention as every other admin fetcher in this app — see src/api/client.ts).
//
// Shapes below are verified against the actual shipped C# DTOs (crypto-service), NOT the earlier
// speculative design doc (docs/wallet-service-docs/crypto-wallet/binance-kyc/07-...). Notable
// differences from that doc: KycAdequacyResult has no `userId`/`checkedAt` fields, MissingFields are
// PascalCase field names (not upper-snake), and the summary/detail DTOs use `Status`/
// `LatestOperationStatus` rather than the doc's guessed `operationStatus`/`failedStep`.

/** The sub-account's own lifecycle status (crypto-service's, not Binance's). */
export type CryptoSubAccountStatus = "Active" | "Frozen" | "Suspended";

/** Where this user's KYC data stands with Binance. NotSubmitted/Submitted are normal, expected
 * "no outcome yet" states — not errors. */
export type CryptoKycShareStatus =
  | "NotSubmitted"
  | "Submitted"
  | "SubmissionFailed"
  | "ProviderPending"
  | "ProviderApproved"
  | "ProviderRejected";

/** Status of the underlying step-orchestrated provisioning Operation. */
export type CryptoOperationStatus = "Pending" | "Running" | "Succeeded" | "Failed";

// ── GET /api/crypto/admin/CryptoSubAccounts (list) ──────────────────────────

export type ListCryptoSubAccountsParams = {
  kycShareStatus?: CryptoKycShareStatus;
  page?: number;
  pageSize?: number;
};

export type AdminCryptoSubAccountSummary = {
  id: string;
  userId: string;
  exchangeSubAccountId: string;
  status: CryptoSubAccountStatus;
  kycShareStatus: CryptoKycShareStatus;
  kycSharedAt: string | null;
  binanceKycRequestNo: string | null;
  binanceKycRawStatus: string | null;
  /** Null if no linked operation row was found — shouldn't normally happen, but defend against it. */
  latestOperationStatus: CryptoOperationStatus | null;
  createdAt: string;
};

// ── GET /api/crypto/admin/CryptoSubAccounts/{userId} (detail) ───────────────

/** Steps run in this fixed order when the operation runs fully: CreateSubAccountStep →
 * ShareKycDataStep → CreateApiKeyStep → RestrictIpStep. A step not yet reached is simply absent
 * from the array — there is no "Pending" placeholder row for it. */
export type CryptoOperationStepDto = {
  stepName: string;
  status: CryptoOperationStatus;
  attempts: number;
  /** JSON-serialized string, shape varies per step — render as a collapsible/pretty-printed blob. */
  output: string | null;
  error: string | null;
};

export type CryptoOperationDetailDto = {
  id: string;
  operationType: string;
  entityRef: string;
  status: CryptoOperationStatus;
  createdAt: string;
  completedAt: string | null;
  steps: CryptoOperationStepDto[];
};

export type AdminCryptoSubAccountDetail = {
  id: string;
  userId: string;
  exchangeSubAccountId: string;
  exchangeSubAccountRef: string;
  status: CryptoSubAccountStatus;
  kycShareStatus: CryptoKycShareStatus;
  kycSharedAt: string | null;
  binanceKycRequestNo: string | null;
  /** Binance's raw status snapshot — possibly stale/null until the async webhook lands. */
  binanceKycRawStatus: string | null;
  binanceKycStatusUpdatedAt: string | null;
  createdAt: string;
  latestOperation: CryptoOperationDetailDto | null;
};

// ── GET /api/crypto/admin/CryptoSubAccounts/{userId}/kyc-adequacy ───────────

export type CryptoKycAdequacyResult = {
  isAdequate: boolean;
  /** PascalCase field names, e.g. "City", "DocumentNumber", "SelfieUrl" — humanize for display. */
  missingFields: string[];
  kycCaseId: string | null;
};

// ── POST /api/crypto/admin/CryptoSubAccounts/{userId}/retry-kyc-share ───────

/** Deliberately narrow — refetch the detail query after a successful retry rather than trying to
 * reconstruct the full detail view from this. */
export type CryptoSubAccountRetryResult = {
  id: string;
  exchangeSubAccountId: string;
  exchangeSubAccountRef: string;
};

// ── POST /api/crypto/admin/CryptoSubAccounts/{userId}/refetch-kyc-status ────

/** kycStatus is null when Binance answered but has no status yet to report — the existing stored
 * record is left untouched in that case, so refetch the detail query regardless either way. */
export type RefetchBinanceKycStatusResult = {
  kycStatus: string | null;
  failReason: string | null;
  updatedAt: string;
};
