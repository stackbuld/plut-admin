import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type {
  LedgerTransactionDetailDto,
  ListLedgerTransactionsParams,
  PostingIndexRowDto,
} from "./types/ledger-transactions.types";

// docs/ledger-service-docs/admin-console/04-TRANSACTIONS_EXPLORER.md
const BASE = "/api/ledger/admin/Transactions";

export const listLedgerTransactions = (p: ListLedgerTransactionsParams) => {
  const params: Record<string, unknown> = { ledger: p.ledger };
  if (p.account) params.account = p.account;
  if (p.userId) params.userId = p.userId;
  if (p.txType) params.txType = p.txType;
  if (p.product) params.product = p.product;
  if (p.channel) params.channel = p.channel;
  if (p.reference) params.reference = p.reference;
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  if (p.limit) params.limit = p.limit;
  return apiGet<PostingIndexRowDto[]>(`${BASE}${buildQs(params)}`);
};

export const getLedgerTransaction = (ledger: string, reference: string) =>
  apiGet<LedgerTransactionDetailDto>(`${BASE}/${encodeURIComponent(reference)}${buildQs({ ledger })}`);

export const ledgerTransactionKeys = {
  all: () => ["admin", "ledger", "transactions"] as const,
  lists: () => [...ledgerTransactionKeys.all(), "list"] as const,
  list: (p: ListLedgerTransactionsParams) => [...ledgerTransactionKeys.lists(), p] as const,
  detail: (ledger: string, reference: string) =>
    [...ledgerTransactionKeys.all(), "detail", ledger, reference] as const,
};

export const ledgerTransactionQueries = {
  list: (p: ListLedgerTransactionsParams) =>
    queryOptions({
      queryKey: ledgerTransactionKeys.list(p),
      queryFn: () => listLedgerTransactions(p),
      staleTime: 15_000,
      enabled: Boolean(p.ledger),
    }),

  detail: (ledger: string, reference: string) =>
    queryOptions({
      queryKey: ledgerTransactionKeys.detail(ledger, reference),
      queryFn: () => getLedgerTransaction(ledger, reference),
      staleTime: 15_000,
      enabled: Boolean(ledger && reference),
    }),
};
