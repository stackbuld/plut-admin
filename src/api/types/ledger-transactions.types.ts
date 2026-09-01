// docs/ledger-service-docs/admin-console/04-TRANSACTIONS_EXPLORER.md

export type PostingIndexRowDto = {
  ledger: string;
  region: string;
  txId: string;
  reference: string;
  postingSeq: number;
  sourceAccount: string;
  destinationAccount: string;
  amountMinor: number;
  assetCode: string;
  txType: string;
  committedAt: string;
  userId: string | null;
  product: string | null;
  channel: string | null;
  correlationId: string | null;
  tenantId: string | null;
  jurisdiction: string | null;
  revenueCategory: string | null;
  costCategory: string | null;
  service: string | null;
  provider: string | null;
  userTier: string | null;
  userSegment: string | null;
};

export type ListLedgerTransactionsParams = {
  ledger: string;
  account?: string;
  userId?: string;
  txType?: string;
  product?: string;
  channel?: string;
  reference?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type LedgerPostingDto = {
  source: string;
  destination: string;
  amountMinor: number;
  assetCode: string;
};

export type LedgerTransactionDetailDto = {
  ledgerTxId: string;
  region: string;
  ledgerDomain: string;
  ledger: string;
  reference: string;
  txType: string;
  postings: LedgerPostingDto[];
  committedAt: string;
  reverted: boolean;
  revertedByTxId: string | null;
  revertsTxId: string | null;
  metadata: Record<string, unknown> | null;
};
