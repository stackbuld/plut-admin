// docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md

export type RevertTransactionResultDto = {
  reversalTxId: string;
  originalTxId: string;
  ledger: string;
  committedAt: string;
};

export type PostTransferResultDto = {
  ledgerTxId: string;
  ledger: string;
  reference: string;
  committedAt: string;
  replayed: boolean;
};

export const MANUAL_POSTING_TYPES = ["ProviderFloatSeed", "Correction", "InitialFunding"] as const;
export type ManualPostingType = (typeof MANUAL_POSTING_TYPES)[number];

export type PostManualTransferRequest = {
  ledger: string;
  type: ManualPostingType;
  source: string;
  destination: string;
  amountMinor: number;
  asset: string;
  reason: string;
};

export type LedgerAdminAuditRowDto = {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: "Revert" | "ManualPost";
  ledger: string;
  targetReference: string;
  detailJson: string;
  reason: string;
  success: boolean;
  createdAt: string;
};

export type PagedLedgerAdminAuditDto = {
  items: LedgerAdminAuditRowDto[];
  page: number;
  pageSize: number;
  totalCount: number;
};
