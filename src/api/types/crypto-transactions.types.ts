// crypto-service admin Transactions Explorer — /api/crypto/admin/Transactions, same AdminOnly
// policy + { success, data, message } envelope as every other admin fetcher here (see
// src/api/client.ts). See
// docs/wallet-service-docs/crypto-wallet/admin-console/05-TRANSACTIONS_EXPLORER.md.
//
// `CryptoTransaction` is the unified, denormalized ledger row for every balance event — one table
// covers Deposit/Withdrawal/Buy/Sell/Swap/FeeDebit/Reversal. This screen queries it directly
// rather than joining out per operation type; PlatformFee/SpreadFee/NetworkFee are copied onto
// every row for exactly that reason (§1 of the doc above).

/** Values confirmed against `CryptoTransactionType` (crypto-service Domain/Enums/Enums.cs). */
export type CryptoTransactionType =
  | "Deposit"
  | "Withdrawal"
  | "Buy"
  | "Sell"
  | "Swap"
  | "FeeDebit"
  | "Reversal";

/** Values confirmed against `CryptoTransactionStatus` (crypto-service Domain/Enums/Enums.cs). */
export type CryptoTransactionStatus =
  | "Pending"
  | "AwaitingConfirmation"
  | "Successful"
  | "Failed"
  | "Reversed";

/** Values confirmed against `TransactionDirection` (crypto-service Domain/Enums/Enums.cs). */
export type CryptoTransactionDirection = "Credit" | "Debit";

// ── GET /api/crypto/admin/Transactions ──────────────────────────────────────
// ?userId=&asset=&type=&status=&from=&to=&page=1&pageSize=50 — every filter optional.

export type ListCryptoTransactionsParams = {
  userId?: string;
  asset?: string;
  type?: CryptoTransactionType;
  status?: CryptoTransactionStatus;
  /** ISO date/datetime string. */
  from?: string;
  /** ISO date/datetime string. */
  to?: string;
  page?: number;
  pageSize?: number;
};

export type CryptoTransactionListItemDto = {
  id: string;
  userId: string;
  asset: string;
  type: CryptoTransactionType;
  direction: CryptoTransactionDirection;
  amount: number;
  networkFee: number;
  platformFee: number;
  spreadFee: number;
  netAmount: number;
  status: CryptoTransactionStatus;
  ledgerTransactionId: string;
  externalTxHash: string | null;
  createdAt: string;
};

export type PagedCryptoTransactionsDto = {
  items: CryptoTransactionListItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
};

// ── GET /api/crypto/admin/Transactions/summary?from=&to= ───────────────────
// Defaults to the last 7 days server-side when from/to are omitted. Shared with the Dashboard's
// "Today's Volume" tile per the doc's §2 note — same endpoint, both screens call it.

export type CryptoTransactionsSummaryParams = {
  from?: string;
  to?: string;
};

export type CryptoTransactionTypeSummary = {
  count: number;
  totalUsdEquivalent: number;
};

export type CryptoTransactionsSummaryDto = {
  deposit: CryptoTransactionTypeSummary;
  withdrawal: CryptoTransactionTypeSummary;
  buy: CryptoTransactionTypeSummary;
  sell: CryptoTransactionTypeSummary;
  swap: CryptoTransactionTypeSummary;
};

// ── GET /api/crypto/admin/Transactions/{transactionId} ──────────────────────
// At most one of childOrderId/childSwapId/childWithdrawalId is non-null — the frontend uses
// whichever is set to decide which richer per-type detail page to link to (§2/§3 of the doc):
// childWithdrawalId -> the existing Withdrawals detail page; childOrderId/childSwapId have no
// dedicated detail page yet, rendered as plain text.

export type CryptoTransactionDetailDto = CryptoTransactionListItemDto & {
  idempotencyKey: string;
  correlationId: string;
  /** Arbitrary JSON, shape varies per transaction type, or null. */
  metadata: unknown | null;
  updatedAt: string;
  childOrderId: string | null;
  childSwapId: string | null;
  childWithdrawalId: string | null;
};
