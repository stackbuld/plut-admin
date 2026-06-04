import { queryOptions } from "@tanstack/react-query";
import {
  mockApproveWithdrawal,
  mockGetSummary,
  mockGetWithdrawal,
  mockListWithdrawals,
  mockRejectWithdrawal,
} from "@/data/mock-withdrawals";
import type {
  ApproveWithdrawalBody,
  ListWithdrawalsParams,
  RejectWithdrawalBody,
} from "./types/withdrawals.types";

// ── Fetchers (mock — swap with apiGet/apiPost when the real API is live) ─────

export const fetchWithdrawalsSummary = () => mockGetSummary();
export const listWithdrawals = (p: ListWithdrawalsParams = {}) => mockListWithdrawals(p);
export const getWithdrawal = (id: string) => mockGetWithdrawal(id);

export const approveWithdrawal = (id: string, body: ApproveWithdrawalBody) =>
  mockApproveWithdrawal(id, body);
export const rejectWithdrawal = (id: string, body: RejectWithdrawalBody) =>
  mockRejectWithdrawal(id, body);

// ── Query keys & options ─────────────────────────────────────────────────────

export const withdrawalKeys = {
  all: () => ["admin", "withdrawals"] as const,
  summary: () => [...withdrawalKeys.all(), "summary"] as const,
  lists: () => [...withdrawalKeys.all(), "list"] as const,
  list: (params?: ListWithdrawalsParams) => [...withdrawalKeys.lists(), params] as const,
  detail: (id: string) => [...withdrawalKeys.all(), id] as const,
};

export const withdrawalQueries = {
  summary: () =>
    queryOptions({
      queryKey: withdrawalKeys.summary(),
      queryFn: fetchWithdrawalsSummary,
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),

  list: (params?: ListWithdrawalsParams) =>
    queryOptions({
      queryKey: withdrawalKeys.list(params),
      queryFn: () => listWithdrawals(params),
      staleTime: 15_000,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: withdrawalKeys.detail(id),
      queryFn: () => getWithdrawal(id),
      staleTime: 15_000,
    }),
};