import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, getAdminUserId, buildQs } from "./client";
import { queryKeys } from "./keys";
import type { PagedResult, TradeListItem, TradeDetail, ListTradesParams } from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listTrades = (params: ListTradesParams = {}) =>
  apiGet<PagedResult<TradeListItem>>(`/giftcards/v1/admin/trades${buildQs(params)}`);

export const getTrade = (id: string) =>
  apiGet<TradeDetail>(`/giftcards/v1/admin/trades/${id}`);

// ── Mutations ─────────────────────────────────────────────────────────────────

export const acceptTrade = (tradeId: string, overridePayout?: number) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  return apiPost<boolean>(`/giftcards/v1/admin/trades/${tradeId}/accept`, {
    adminUserId,
    ...(overridePayout != null ? { overridePayout } : {}),
  });
};

export const rejectTrade = (tradeId: string, reason: string) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  return apiPost<boolean>(`/giftcards/v1/admin/trades/${tradeId}/reject`, {
    adminUserId,
    reason,
  });
};

// ── Query options (co-located cache config) ───────────────────────────────────

export const tradeQueries = {
  list: (params?: ListTradesParams) =>
    queryOptions({
      queryKey: queryKeys.trades.list(params),
      queryFn: () => listTrades(params),
      staleTime: 30_000,      // trades refresh every 30s
      refetchInterval: 30_000, // auto-poll for the pending queue
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.trades.detail(id),
      queryFn: () => getTrade(id),
      staleTime: 60_000,
    }),
};
