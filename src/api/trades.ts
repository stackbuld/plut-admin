import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, getAdminUserId, buildQs } from "./client";
import { queryKeys } from "./keys";
import type { PagedResult, TradeListItem, TradeDetail, ListTradesParams, AdminDashboardStats } from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listTrades = (params: ListTradesParams = {}) =>
  apiGet<PagedResult<TradeListItem>>(`/giftcards/v1/admin/trades${buildQs(params)}`);

export const getTrade = (id: string) =>
  apiGet<TradeDetail>(`/giftcards/v1/admin/trades/${id}`);

// ── Mutations ─────────────────────────────────────────────────────────────────

export const acceptTrade = (tradeId: string, overridePayout?: number, comment?: string) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  const note = comment?.trim();
  return apiPost<boolean>(`/giftcards/v1/admin/trades/${tradeId}/accept`, {
    adminUserId,
    ...(overridePayout != null ? { overridePayout } : {}),
    ...(note ? { comment: note } : {}),
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

export const approveTradeItem = (tradeId: string, itemId: string) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  return apiPost<void>(`/giftcards/v1/admin/trades/${tradeId}/items/${itemId}/approve`, { adminUserId });
};

export const rejectTradeItem = (tradeId: string, itemId: string, reason: string) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  return apiPost<void>(`/giftcards/v1/admin/trades/${tradeId}/items/${itemId}/reject`, { adminUserId, reason });
};

export const editTradeItem = (
  tradeId: string,
  itemId: string,
  changes: { denominationId?: string; quantity?: number },
) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Not authenticated");
  return apiPatch<void>(`/giftcards/v1/admin/trades/${tradeId}/items/${itemId}`, {
    adminUserId,
    ...(changes.denominationId ? { denominationId: changes.denominationId } : {}),
    ...(changes.quantity != null ? { quantity: changes.quantity } : {}),
  });
};

export const fetchAdminStats = () =>
  apiGet<AdminDashboardStats>("/giftcards/v1/admin/stats");

// ── Query options (co-located cache config) ───────────────────────────────────

export const tradeQueries = {
  list: (params?: ListTradesParams) =>
    queryOptions({
      queryKey: queryKeys.trades.list(params),
      queryFn: () => listTrades(params),
      staleTime: 30_000,      // trades refresh every 30s
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.trades.detail(id),
      queryFn: () => getTrade(id),
      staleTime: 60_000,
    }),

  stats: () =>
    queryOptions({
      queryKey: queryKeys.stats.dashboard(),
      queryFn: fetchAdminStats,
      staleTime: 30_000,
    }),
};
