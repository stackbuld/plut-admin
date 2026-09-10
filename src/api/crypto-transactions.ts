import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type {
  CryptoTransactionDetailDto,
  CryptoTransactionsSummaryDto,
  CryptoTransactionsSummaryParams,
  ListCryptoTransactionsParams,
  PagedCryptoTransactionsDto,
} from "./types/crypto-transactions.types";

// crypto-service's Transactions Explorer admin surface — /api/crypto/admin/Transactions, same
// AdminOnly policy + { success, data, message } envelope as every other admin fetcher here (see
// src/api/client.ts). See
// docs/wallet-service-docs/crypto-wallet/admin-console/05-TRANSACTIONS_EXPLORER.md.
const BASE = "/api/crypto/admin/Transactions";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listCryptoTransactions = (p: ListCryptoTransactionsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.userId) params.userId = p.userId;
  if (p.asset) params.asset = p.asset;
  if (p.type) params.type = p.type;
  if (p.status) params.status = p.status;
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  if (p.page) params.page = p.page;
  if (p.pageSize) params.pageSize = p.pageSize;
  return apiGet<PagedCryptoTransactionsDto>(`${BASE}${buildQs(params)}`);
};

/** Defaults to the last 7 days server-side when from/to are omitted. Shared with the Dashboard's
 * "Today's Volume" tile — same endpoint, both screens call it (05-TRANSACTIONS_EXPLORER.md §2). */
export const getCryptoTransactionsSummary = (p: CryptoTransactionsSummaryParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  return apiGet<CryptoTransactionsSummaryDto>(`${BASE}/summary${buildQs(params)}`);
};

export const getCryptoTransaction = (transactionId: string) =>
  apiGet<CryptoTransactionDetailDto>(`${BASE}/${transactionId}`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoTransactionKeys = {
  all: () => ["admin", "crypto", "transactions"] as const,
  lists: () => [...cryptoTransactionKeys.all(), "list"] as const,
  list: (params?: ListCryptoTransactionsParams) =>
    [...cryptoTransactionKeys.lists(), params] as const,
  summaries: () => [...cryptoTransactionKeys.all(), "summary"] as const,
  summary: (params?: CryptoTransactionsSummaryParams) =>
    [...cryptoTransactionKeys.summaries(), params] as const,
  detail: (transactionId: string) => [...cryptoTransactionKeys.all(), transactionId] as const,
};

export const cryptoTransactionQueries = {
  list: (params?: ListCryptoTransactionsParams) =>
    queryOptions({
      queryKey: cryptoTransactionKeys.list(params),
      queryFn: () => listCryptoTransactions(params),
      staleTime: 15_000,
    }),

  /** Also consumed by the Dashboard screen for its "Today's Volume" tile — same query key shape,
   * so both screens share one cache entry when called with the same params. */
  summary: (params?: CryptoTransactionsSummaryParams) =>
    queryOptions({
      queryKey: cryptoTransactionKeys.summary(params),
      queryFn: () => getCryptoTransactionsSummary(params),
      staleTime: 15_000,
    }),

  detail: (transactionId: string) =>
    queryOptions<CryptoTransactionDetailDto>({
      queryKey: cryptoTransactionKeys.detail(transactionId),
      queryFn: () => getCryptoTransaction(transactionId),
      staleTime: 15_000,
    }),
};
