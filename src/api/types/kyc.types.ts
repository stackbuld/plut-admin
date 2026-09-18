// Account-service KYC admin API (docs/account-service/kyc-admin-dashboard in stackbuld-fintech-api).
// All routes live under /api/v1/admin/kyc — a different backend/prefix scheme from VAS/Wallets.

// KycTier already exists in users.types.ts (same shape, used for User.kycTier elsewhere in the app) —
// imported (not redefined) to avoid an ambiguous-export clash in the ./types barrel. users.types.ts
// already exports it, so no re-export is needed here.
import type { KycTier } from "./users.types";

export type KycStatus = "Pending" | "InReview" | "Approved" | "Rejected" | "NeedsInfo" | "Reset";
export type KycCaseType = "User" | "Business";
export type KycDocumentType =
  | "NationalIdFront"
  | "NationalIdBack"
  | "DriversLicense"
  | "Passport"
  | "Selfie"
  | "UtilityBill"
  | "BankStatement"
  | "CertificateOfIncorporation"
  | "Memart"
  | "TaxCertificate"
  | "DirectorId";

// ── GET /api/v1/admin/kyc/cases ─────────────────────────────────────────────
export type ListKycAdminCasesParams = {
  status?: KycStatus;
  tier?: KycTier;
  type?: KycCaseType;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  search?: string;
  page?: number;
  pageSize?: number;
};

export type KycAdminCaseListItem = {
  caseId: string;
  subjectId: string;
  subjectName: string | null;
  subjectEmail: string | null;
  type: KycCaseType;
  targetTier: KycTier;
  status: KycStatus;
  hasPersonalInfo: boolean;
  documentCount: number;
  submittedAt: string;
  lastUpdatedAt: string;
};

export type GetKycAdminCasesResult = {
  items: KycAdminCaseListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

// ── GET /api/v1/admin/kyc/{caseId} ──────────────────────────────────────────
export type KycDocumentMetaFile = { title: string; fileUrl: string };

export type KycCaseDocumentDto = {
  id: string;
  type: KycDocumentType;
  fileName: string;
  contentType: string;
  fileUrl1: string;
  uploadedAt: string;
  documentIdNumber: string | null;
  fileUrl2: string | null;
  metaFileUrls: KycDocumentMetaFile[];
};

export type KycCasePersonalInfoDto = {
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  country: string | null;
  nationality: string | null;
  phoneNumber: string | null;
  email: string | null;
  residentialAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  maritalStatus: string | null;
  documentType: string | null;
  documentNumber: string | null;
  // Tier2 address/utility-bill verification — null unless the user has done that check.
  addressFormatted: string | null;
  addressLatitude: string | null;
  addressLongitude: string | null;
  isAddressRecent: boolean | null;
  provider: string;
  fetchedAt: string;
};

export type KycCaseTimelineDto = {
  previousStatus: KycStatus;
  newStatus: KycStatus;
  comment: string | null;
  actorId: string;
  occurredAt: string;
};

export type KycCaseProviderLogDto = {
  id: string;
  provider: string;
  operation: string;
  request: string | null;
  rawResponse: string | null;
  success: boolean;
  occurredAt: string;
};

export type GetKycCaseDetailResult = {
  caseId: string;
  subjectId: string;
  type: KycCaseType;
  targetTier: KycTier;
  status: KycStatus;
  externalReference: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  documents: KycCaseDocumentDto[];
  timeline: KycCaseTimelineDto[];
  personalInfo: KycCasePersonalInfoDto | null;
  providerLogs: KycCaseProviderLogDto[];
};

// ── GET /api/v1/admin/kyc/stats ─────────────────────────────────────────────
export type KycStatsByStatus = {
  notStarted: number;
  pending: number;
  inReview: number;
  needsInfo: number;
  approved: number;
  rejected: number;
  reset: number;
};

export type KycStatsByTier = {
  tier0: number;
  tier1: number;
  tier2: number;
  tier3: number;
};

export type KycSyncHealth = { approvedCasesMissingPersonalInfo: number };

export type GetKycStatsResult = {
  byStatus: KycStatsByStatus;
  byTier: KycStatsByTier;
  syncHealth: KycSyncHealth;
  totalUsers: number;
};

// ── POST /api/v1/admin/kyc/sync-personal-info ───────────────────────────────
export type SyncKycPersonalInfoResult = { synced: number; failed: number };

// ── POST /api/v1/admin/kyc/{caseId}/reset ───────────────────────────────────
export type ResetKycCaseResult = { caseId: string; status: KycStatus; newUserTier: KycTier };

// ── POST /api/v1/admin/kyc/{caseId}/review ──────────────────────────────────
export type ReviewKycCaseResult = { caseId: string; type: KycCaseType; status: KycStatus };
