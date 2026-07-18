import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, buildQs } from "./client";
import { queryKeys } from "./keys";
import type {
  PagedResult,
  UnmatchedInboundItem,
  ListUnmatchedParams,
  RoutingDecisionDto,
  RedemptionOrderDto,
  CorrelationReviewItemDto,
  ListRoutingDecisionsParams,
  ListRedemptionOrdersParams,
  ReviewQueueParams,
  InvalidateRoutingDecisionBody,
  PinRoutingDecisionBody,
  DispatchRedemptionOrderBody,
  ReassignProviderBody,
  AttachOutcomeBody,
  SaveProviderReplySampleBody,
  SaveProviderReplySampleResult,
  AttachRateQuoteBody,
  ProviderReplySampleDto,
  TeamNumberItem,
  AddTeamNumberBody,
  AwaitingProviderItem,
  TradeSourcingSummary,
  SourcingBadges,
} from "./types";

const BASE = "/giftcards/v1/admin/sourcing";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listUnmatched = (params: ListUnmatchedParams = {}) =>
  apiGet<PagedResult<UnmatchedInboundItem>>(`${BASE}/unmatched${buildQs(params)}`);

export const listRoutingDecisions = (params: ListRoutingDecisionsParams = {}) =>
  apiGet<PagedResult<RoutingDecisionDto>>(`${BASE}/routing${buildQs(params)}`);

export const listRedemptionOrders = (params: ListRedemptionOrdersParams = {}) =>
  apiGet<PagedResult<RedemptionOrderDto>>(`${BASE}/redemption-orders${buildQs(params)}`);

export const getReviewQueue = (params: ReviewQueueParams = {}) =>
  apiGet<PagedResult<CorrelationReviewItemDto>>(`${BASE}/review-queue${buildQs(params)}`);

export const listTeamNumbers = () => apiGet<TeamNumberItem[]>(`${BASE}/team-numbers`);

// ── Mutations ───────────────────────────────────────────────────────────────

export const invalidateRoutingDecision = (id: string, body: InvalidateRoutingDecisionBody = {}) =>
  apiPost<{ routingDecisionId: string; cardSpecKey: string; status: string }>(
    `${BASE}/routing/${id}/invalidate`,
    body,
  );

export const pinRoutingDecision = (body: PinRoutingDecisionBody) =>
  apiPost<{ routingDecisionId: string; cardSpecKey: string; providerId: string; providerName: string; expiresAt: string }>(
    `${BASE}/routing/pin`,
    body,
  );

export const dispatchRedemptionOrder = (body: DispatchRedemptionOrderBody) =>
  apiPost<{ redemptionOrderId: string; tradeId: string; providerId: string; tradeReference: string; wahaMessageId?: string | null }>(
    `${BASE}/redemption-orders/dispatch`,
    body,
  );

export const reassignProvider = (body: ReassignProviderBody) =>
  apiPost<{ redemptionOrderId: string; newProviderId: string; wahaMessageId?: string | null }>(
    `${BASE}/reassign-provider`,
    body,
  );

export const attachOutcome = (body: AttachOutcomeBody) =>
  apiPost<{ redemptionOrderId: string; inboundMessageId: string; outcome: string }>(
    `${BASE}/attach-outcome`,
    body,
  );

// Feedback loop: save a provider reply as a structured few-shot sample.
export const saveProviderReplySample = (body: SaveProviderReplySampleBody) =>
  apiPost<SaveProviderReplySampleResult>(`${BASE}/review/save-sample`, body);

// Rate-plane manual recovery: attach a review message to an open rate request and record the quote.
export const attachRateQuote = (body: AttachRateQuoteBody) =>
  apiPost<{ rateRequestId: string; inboundMessageId: string; quotedValue: number }>(
    `${BASE}/attach-rate`,
    body,
  );

// Ignore: dismiss a review-queue message without attaching or learning.
export const dismissInboundMessage = (messageId: string) =>
  apiPost<{ inboundMessageId: string; correlationStatus: string }>(
    `${BASE}/review/${messageId}/dismiss`,
  );

// Provider learned samples: list + remove.
export const listProviderReplySamples = (providerId: string) =>
  apiGet<ProviderReplySampleDto[]>(`${BASE}/providers/${providerId}/samples`);

export const removeProviderReplySample = (providerId: string, sampleId: string) =>
  apiDelete<{ providerId: string; sampleId: string; removed: boolean }>(
    `${BASE}/providers/${providerId}/samples/${sampleId}`,
  );

export const providerSampleQueries = {
  list: (providerId: string) =>
    queryOptions({
      queryKey: [...queryKeys.sourcing.all(), "provider-samples", providerId] as const,
      queryFn: () => listProviderReplySamples(providerId),
      staleTime: 30_000,
    }),
};

// Record a per-card redemption outcome on a multi-card order (from the trade detail checklist).
export const recordCardOutcome = (
  orderId: string,
  index: number,
  body: { outcome: "Redeemed" | "Failed" | "Unknown"; reasonCode?: string | null; reasonText?: string | null },
) =>
  apiPost<{ redemptionOrderId: string; cardIndex: number; orderStatus: string; pendingCards: number }>(
    `${BASE}/redemption-orders/${orderId}/cards/${index}/outcome`,
    body,
  );

// Re-send the card images a provider hasn't received yet (header-sent, image-missing recovery).
export const resendCardImages = (orderId: string) =>
  apiPost<{ redemptionOrderId: string; imagesSent: number; imagesTotal: number }>(
    `${BASE}/redemption-orders/${orderId}/resend-images`,
  );

export const addTeamNumber = (body: AddTeamNumberBody) =>
  apiPost<TeamNumberItem>(`${BASE}/team-numbers`, body);

export const setTeamNumberActive = (id: string, isActive: boolean) =>
  apiPatch<TeamNumberItem>(`${BASE}/team-numbers/${id}/active`, { isActive });

// ── Queries ───────────────────────────────────────────────────────────────────

export const unmatchedQueries = {
  list: (params?: ListUnmatchedParams) =>
    queryOptions({
      queryKey: queryKeys.sourcing.unmatched(params),
      queryFn: () => listUnmatched(params),
      staleTime: 30_000,
    }),
};

export const routingQueries = {
  list: (params?: ListRoutingDecisionsParams) =>
    queryOptions({
      queryKey: queryKeys.sourcing.routing(params),
      queryFn: () => listRoutingDecisions(params),
      staleTime: 30_000,
    }),
};

export const redemptionOrderQueries = {
  list: (params?: ListRedemptionOrdersParams) =>
    queryOptions({
      queryKey: queryKeys.sourcing.redemptionOrders(params),
      queryFn: () => listRedemptionOrders(params),
      staleTime: 30_000,
    }),
};

export const reviewQueueQueries = {
  list: (params?: ReviewQueueParams) =>
    queryOptions({
      queryKey: queryKeys.sourcing.reviewQueue(params),
      queryFn: () => getReviewQueue(params),
      staleTime: 15_000,
    }),
};

export const teamNumberQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.sourcing.teamNumbers(),
      queryFn: () => listTeamNumbers(),
      staleTime: 30_000,
    }),
};

// ── Awaiting providers (discovery expired with no reply) ────────────────────────

export const listAwaitingProviders = () =>
  apiGet<AwaitingProviderItem[]>(`${BASE}/awaiting-providers`);

// Re-broadcast rate discovery for a trade whose window expired with no reply.
export const retryTradeDiscovery = (tradeId: string) =>
  apiPost<{ tradeId: string; outcome: string; redemptionOrderId?: string | null }>(
    `${BASE}/trades/${tradeId}/retry-discovery`,
  );

// Dismiss a trade from the awaiting list (no auto re-broadcast until re-triggered).
export const ignoreTradeDiscovery = (tradeId: string) =>
  apiPost<{ tradeId: string; rateRequestId: string; status: string }>(
    `${BASE}/trades/${tradeId}/ignore-discovery`,
  );

export const awaitingProviderQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.sourcing.awaiting(),
      queryFn: listAwaitingProviders,
      staleTime: 15_000,
    }),
};

// ── Trade sourcing summary (trade detail "Vendor & Redemption" panel) ───────────

export const getTradeSourcingSummary = (tradeId: string) =>
  apiGet<TradeSourcingSummary>(`${BASE}/trades/${tradeId}/summary`);

export const tradeSourcingQueries = {
  summary: (tradeId: string) =>
    queryOptions({
      queryKey: queryKeys.sourcing.tradeSummary(tradeId),
      queryFn: () => getTradeSourcingSummary(tradeId),
      staleTime: 30_000,
    }),
};

// ── Sourcing nav badge counts ───────────────────────────────────────────────────

export const getSourcingBadges = () => apiGet<SourcingBadges>(`${BASE}/badges`);

export const sourcingBadgeQueries = {
  counts: () =>
    queryOptions({
      queryKey: queryKeys.sourcing.badges(),
      queryFn: getSourcingBadges,
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),
};
