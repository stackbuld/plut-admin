import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import { queryKeys } from "./keys";
import type {
  PagedResult,
  AiConversationListItem,
  AiConversationDetail,
  AiUsageStats,
  ListAiConversationsParams,
  WahaSessionInfo,
  WahaGroup,
} from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listAiConversations = (params: ListAiConversationsParams = {}) =>
  apiGet<PagedResult<AiConversationListItem>>(`/api/v1/ai/admin/conversations${buildQs(params)}`);

export const getAiConversation = (id: string) =>
  apiGet<AiConversationDetail>(`/api/v1/ai/admin/conversations/${id}`);

export const getAiUsageStats = (days: number) =>
  apiGet<AiUsageStats>(`/api/v1/ai/admin/usage/stats${buildQs({ days })}`);

// ── WhatsApp (WAHA) session ─────────────────────────────────────────────────────

export const getWahaSession = () =>
  apiGet<WahaSessionInfo>(`/api/v1/ai/admin/waha/session`);

export const startWahaSession = () =>
  apiPost<WahaSessionInfo>(`/api/v1/ai/admin/waha/session/start`);

export const restartWahaSession = () =>
  apiPost<WahaSessionInfo>(`/api/v1/ai/admin/waha/session/restart`);

export const logoutWahaSession = () =>
  apiPost<WahaSessionInfo>(`/api/v1/ai/admin/waha/session/logout`);

// Request a phone-pairing code for the given full international number (digits only).
// The response `data` is the pairing code string itself (e.g. "ABCD-1234").
export const requestWahaCode = (phoneNumber: string) =>
  apiPost<string>(`/api/v1/ai/admin/waha/session/request-code`, { phoneNumber });

// The WhatsApp groups the paired number belongs to — for picking a merchant's channel.
// Fails (throws) when the session isn't WORKING; the caller surfaces "connect first".
export const getWahaGroups = () =>
  apiGet<WahaGroup[]>(`/api/v1/ai/admin/waha/groups`);

// ── Query options (co-located cache config) ───────────────────────────────────

export const aiQueries = {
  conversations: (params?: ListAiConversationsParams) =>
    queryOptions({
      queryKey: queryKeys.ai.conversations(params),
      queryFn: () => listAiConversations(params),
      staleTime: 30_000,
    }),

  conversation: (id: string) =>
    queryOptions({
      queryKey: queryKeys.ai.conversation(id),
      queryFn: () => getAiConversation(id),
      staleTime: 30_000,
    }),

  stats: (days: number) =>
    queryOptions({
      queryKey: queryKeys.ai.stats(days),
      queryFn: () => getAiUsageStats(days),
      staleTime: 60_000,
    }),
};

export const wahaQueries = {
  // Poll on a short interval so the QR and status live-update while the admin pairs the number.
  session: () =>
    queryOptions({
      queryKey: queryKeys.waha.session(),
      queryFn: getWahaSession,
      staleTime: 0,
      refetchInterval: 3000,
    }),

  // Groups change rarely — cache briefly; refetched when the merchant picker opens.
  groups: () =>
    queryOptions({
      queryKey: queryKeys.waha.groups(),
      queryFn: getWahaGroups,
      staleTime: 30_000,
      retry: false,
    }),
};
