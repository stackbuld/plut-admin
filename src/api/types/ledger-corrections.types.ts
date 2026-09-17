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
  /**
   * Whole minor units as a STRING. The server types this as BigInteger because 1 ETH is 10^18 wei —
   * past JavaScript's 2^53 exact-integer limit, so a JSON number would be silently rounded in the
   * browser before it ever left. Build it with `toMinorString`, never with float maths. (Sending a
   * number still parses server-side, but don't: the rounding happens on this side.)
   */
  amountMinor: string;
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
