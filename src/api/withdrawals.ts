import { queryOptions } from "@tanstack/react-query";
import { mockGetSummary } from "@/data/mock-withdrawals";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  AdminWithdrawal,
  ApproveWithdrawalBody,
  ListWithdrawalsParams,
  RejectWithdrawalBody,
  WithdrawalsSummary,
} from "./types/withdrawals.types";
import type { PagedResult } from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

// No summary endpoint yet — still mocked
export const fetchWithdrawalsSummary = (): Promise<WithdrawalsSummary> =>
  mockGetSummary();

export const listWithdrawals = (p: ListWithdrawalsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.status && p.status !== "All") params.Status = p.status;
  if (p.userId) params.UserId = p.userId;
  if (p.walletId) params.WalletId = p.walletId;
  if (p.dateFrom) params.DateFrom = p.dateFrom;
  if (p.dateTo) params.DateTo = p.dateTo;
  if (p.page) params.Page = p.page;
  if (p.pageSize) params.PageSize = p.pageSize;
  return apiGet<PagedResult<AdminWithdrawal>>(`/api/admin/Withdrawals${buildQs(params)}`);
};

export const getWithdrawal = (id: string) =>
  apiGet<AdminWithdrawal>(`/api/admin/Withdrawals/${id}`);

export const approveWithdrawal = (id: string, body: ApproveWithdrawalBody) =>
  apiPost<void>(`/api/admin/Withdrawals/${id}/approve`, body);

export const rejectWithdrawal = (id: string, body: RejectWithdrawalBody) =>
  apiPost<void>(`/api/admin/Withdrawals/${id}/reject`, body);

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
