import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type { PagedResult } from "./types";

/**
 * Admin wallet endpoints. Verified live against `https://api-v2.plut.ng` (Administrator role):
 *
 *   GET  /api/admin/Wallets?userId={userId}             -> AdminWallet[]   (resolve a user's wallets)
 *   GET  /api/admin/Wallets/{walletId}/balance          -> AdminWalletBalance
 *   GET  /api/admin/Wallets/{walletId}/transactions     -> PaginatedList<AdminWalletTransaction>
 *   POST /api/admin/Wallets/{walletId}/debit            -> DebitWalletResult
 *   POST /api/admin/Wallets/{walletId}/credit           -> AdminCreditWalletResult
 *   GET  /api/admin/Wallets/adjustments/audit           -> PaginatedList<WalletAdjustmentAudit>
 */

// AdminWalletDto
export type AdminWallet = {
  id: string;
  userId: string;
  userName: string | null;
  currency: string;
  status: string;
  balance: number;
};

// AdminBalanceDto
export type AdminWalletBalance = {
  walletId: string;
  userId?: string;
  userName?: string | null;
  balance: number; // total
  currency: string;
  availableBalance: number; // spendable now (current balance)
  heldBalance: number; // on hold (holding balance)
};

// AdminTransactionDto
export type AdminWalletTransaction = {
  id: string;
  userId: string;
  userName: string | null;
  reference: string;
  type: string; // "Refund" | "WithdrawalLock" | "WithdrawalSettlement" | ...
  direction: string; // "Credit" | "Debit"
  amount: number;
  fee: number;
  totalAmount: number;
  currency: string;
  counterparty: string | null;
  status: string;
  narration: string | null;
  createdAt: string;
  completedAt: string | null;
};

// DebitWalletResult
export type DebitWalletResult = {
  ledgerTxId: string;
  walletId: string;
  balanceMinor: number;
  transactionId: string;
};

// AdminCreditWalletResult
export type CreditWalletResult = {
  ledgerTxId: string;
  walletId: string;
  balanceMinor: number;
  transactionId: string;
};

// WalletAdjustmentAuditDto — the append-only record of every admin credit/debit, successful or not.
// Amounts are MAJOR units, already converted server-side with the row's own currency precision.
export type WalletAdjustmentAudit = {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: "Credit" | "Debit";
  walletId: string;
  targetUserId: string;
  targetUserName: string | null;
  amount: number;
  currency: string;
  narration: string;
  success: boolean;
  ledgerTxId: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  createdAt: string;
};

export type ListWalletTxnsParams = {
  type?: string;
  status?: string;
  direction?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export const listUserWallets = (userId: string) =>
  apiGet<AdminWallet[]>(`/api/admin/Wallets${buildQs({ userId })}`);

export const getWalletBalance = (walletId: string) =>
  apiGet<AdminWalletBalance>(`/api/admin/Wallets/${walletId}/balance`);

export const listWalletTransactions = (walletId: string, p: ListWalletTxnsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.type) params.type = p.type;
  if (p.status) params.status = p.status;
  if (p.direction) params.direction = p.direction;
  if (p.startDate) params.startDate = p.startDate;
  if (p.endDate) params.endDate = p.endDate;
  if (p.page) params.page = p.page;
  if (p.pageSize) params.pageSize = p.pageSize;
  return apiGet<PagedResult<AdminWalletTransaction>>(
    `/api/admin/Wallets/${walletId}/transactions${buildQs(params)}`,
  );
};

export const debitWallet = (
  walletId: string,
  body: { amount: number; currency: string; narration: string; idempotencyKey: string },
) => apiPost<DebitWalletResult>(`/api/admin/Wallets/${walletId}/debit`, body);

export const creditWallet = (
  walletId: string,
  body: { amount: number; currency: string; narration: string; idempotencyKey: string },
) => apiPost<CreditWalletResult>(`/api/admin/Wallets/${walletId}/credit`, body);

export const listWalletAdjustmentAudit = (
  walletId: string | undefined,
  page: number,
  pageSize = 50,
) =>
  apiGet<PagedResult<WalletAdjustmentAudit>>(
    `/api/admin/Wallets/adjustments/audit${buildQs({ walletId, page, pageSize })}`,
  );

export const walletKeys = {
  all: () => ["admin", "wallets"] as const,
  byUser: (userId: string) => [...walletKeys.all(), "by-user", userId] as const,
  balance: (walletId: string) => [...walletKeys.all(), walletId, "balance"] as const,
  txns: (walletId: string, params?: ListWalletTxnsParams) =>
    [...walletKeys.all(), walletId, "transactions", params] as const,
  adjustmentAudit: (walletId: string | undefined, page: number) =>
    [...walletKeys.all(), "adjustment-audit", walletId, page] as const,
};

export const walletQueries = {
  byUser: (userId: string) =>
    queryOptions({
      queryKey: walletKeys.byUser(userId),
      queryFn: () => listUserWallets(userId),
      staleTime: 30_000,
    }),

  balance: (walletId: string) =>
    queryOptions({
      queryKey: walletKeys.balance(walletId),
      queryFn: () => getWalletBalance(walletId),
      staleTime: 30_000,
    }),

  transactions: (walletId: string, params?: ListWalletTxnsParams) =>
    queryOptions({
      queryKey: walletKeys.txns(walletId, params),
      queryFn: () => listWalletTransactions(walletId, params),
      staleTime: 30_000,
    }),
};

export const walletAuditQueries = {
  adjustments: (walletId: string | undefined, page: number) =>
    queryOptions({
      queryKey: walletKeys.adjustmentAudit(walletId, page),
      queryFn: () => listWalletAdjustmentAudit(walletId, page),
      staleTime: 10_000,
    }),
};
