import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import { queryKeys } from "./keys";
import type {
  PagedResult,
  AiConversationListItem,
  AiConversationDetail,
  AiUsageStats,
  ListAiConversationsParams,
} from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listAiConversations = (params: ListAiConversationsParams = {}) =>
  apiGet<PagedResult<AiConversationListItem>>(`/api/v1/ai/admin/conversations${buildQs(params)}`);

export const getAiConversation = (id: string) =>
  apiGet<AiConversationDetail>(`/api/v1/ai/admin/conversations/${id}`);

export const getAiUsageStats = (days: number) =>
  apiGet<AiUsageStats>(`/api/v1/ai/admin/usage/stats${buildQs({ days })}`);

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
