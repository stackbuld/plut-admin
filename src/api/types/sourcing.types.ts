// ── Sourcing · Unmatched inbound ──────────────────────────────────────────────
// Messages the engagement guard did NOT attach to a provider: WhatsApp groups (@g.us)
// and unregistered 1:1 chats. The assistant logs and ignores these; admins triage them here.
// Backend enums serialize as STRINGS; the preview is server-side redacted (no card codes / PII).

export type UnmatchedInboundItem = {
  id: string;
  channelChatId: string;
  isGroup: boolean;
  kind: string;
  rawTextPreview?: string | null;
  mediaCount: number;
  receivedAt: string;
};

export type ListUnmatchedParams = {
  page?: number;
  pageSize?: number;
};

// ── Sourcing · Our Numbers (team-number allowlist) ────────────────────────────
// Our own side's WhatsApp numbers. In a provider GROUP, messages from these numbers
// (and our own WAHA line) are treated as internal and ignored — only the provider's
// messages are acted on. Backend returns a plain array (not paged).

export type TeamNumberItem = {
  id: string;
  phoneNormalized: string;
  rawInput: string;
  label: string;
  isActive: boolean;
  created: string;
};

export type AddTeamNumberBody = {
  rawInput: string;
  label: string;
};

export type SetTeamNumberActiveBody = {
  isActive: boolean;
};

// ── Sourcing · Allocations back-office ────────────────────────────────────────
// The consolidated admin view: current routing allocations, in-flight redemption
// orders, and the correlation review queue. Backend enums serialize as STRINGS.

export type RoutingDecisionStatus = "Active" | "Expired" | "Invalidated";

export type RedemptionOrderStatus =
  | "Created"
  | "Dispatched"
  | "AwaitingProvider"
  | "OutcomeRecorded"
  | "NeedsHumanReview"
  | "TimedOut"
  | "Synced"
  | "Cancelled";

export type RedemptionOutcome = "Redeemed" | "Failed" | "Unknown";

export type CorrelationStatus =
  | "AutoAttached"
  | "PendingHuman"
  | "HumanAttached"
  | "AwaitingClarification"
  | "Discarded";

// A cached routing decision: "who currently wins this card spec, and until when".
export type RoutingDecisionDto = {
  id: string;
  cardSpecKey: string;
  brandCode: string;
  countryCode: string;
  denominationAmount: number;
  denominationCurrency: string;
  cardFormat: string;
  bestProviderId: string;
  bestProviderName?: string | null;
  normalizedUsdPerCardUsd: number;
  quotedCurrency: string;
  quotedRateValue: number;
  decidedAt: string;
  expiresAt: string;
  status: RoutingDecisionStatus;
  isFresh: boolean;
};

// An in-flight (or completed) redemption order forwarded to a provider.
export type RedemptionOrderDto = {
  id: string;
  tradeId: string;
  tradeReference: string;
  providerId: string;
  status: RedemptionOrderStatus;
  brandCode: string;
  countryCode: string;
  denominationAmount: number;
  denominationCurrency: string;
  cardFormat: string;
  imageUrls: string[];
  outcome?: RedemptionOutcome | null;
  outcomeReasonCode?: string | null;
  outcomeReasonText?: string | null;
  correlationConfidence?: number | null;
  correlationMethod?: string | null;
  dispatchedAt?: string | null;
  outcomeAt?: string | null;
  timeoutAt: string;
  advisorySyncedAt?: string | null;
  totalCards: number;
  redeemedCards: number;
};

// A pending inbound provider message awaiting human correlation.
export type InboundMessageDto = {
  id: string;
  providerId?: string | null;
  channelChatId: string;
  wahaMessageId: string;
  kind: string;
  rawText?: string | null;
  mediaUrls: string[];
  interpretationConfidence?: number | null;
  correlationStatus: CorrelationStatus;
  receivedAt: string;
};

// The agent's reasoning for why a message landed in review (why it wasn't auto-recorded).
export type AgentReviewDto = {
  reasoning?: string | null;
  action?: string | null; // record | ask_clarification | ignore | defer_to_human
  clarificationQuestion?: string | null;
  suggestedRef?: string | null; // "REQ-…" / "PLT-…" the agent leaned toward
  targetKind?: string | null; // Rate | Redemption | None
  ambiguousRefs: string[];
};

// An open rate ask — a candidate to attach a review-queue RATE reply to.
export type RateAskDto = {
  id: string;
  ref: string;
  brandCode: string;
  countryCode: string;
  denominationAmount: number;
  denominationCurrency: string;
  cardFormat: string;
  status: string;
  askedAt: string;
};

// One row of the correlation review queue: a message + the agent's reasoning + candidate orders + rate asks.
export type CorrelationReviewItemDto = {
  message: InboundMessageDto;
  candidateOrders: RedemptionOrderDto[];
  agentReview?: AgentReviewDto | null;
  candidateRateAsks: RateAskDto[];
};

// Save a provider reply as a structured few-shot sample (feedback loop, with label + operator comment).
export type SaveProviderReplySampleBody = {
  inboundMessageId: string;
  plane: "Rate" | "Redemption";
  label?: string | null;
  comment?: string | null;
  sampleText?: string | null;
  source?: "Manual" | "AutoConfirmed";
};

export type SaveProviderReplySampleResult = {
  providerId: string;
  plane: string;
  saved: boolean;
  sampleId?: string | null;
};

// Attach a review message to an open rate request and record the quote (rate-plane manual recovery).
export type AttachRateQuoteBody = {
  inboundMessageId: string;
  rateRequestId: string;
  quotedValue: number;
  rateUnit?: string;
  quotedCurrency?: string;
};

// A provider's learned few-shot sample.
export type ProviderReplySampleDto = {
  id: string;
  plane: string;
  text: string;
  label: string | null;
  comment: string | null;
  source: string;
  createdAt: string;
};

export type ListRoutingDecisionsParams = {
  status?: RoutingDecisionStatus;
  page?: number;
  pageSize?: number;
};

export type ListRedemptionOrdersParams = {
  status?: RedemptionOrderStatus;
  page?: number;
  pageSize?: number;
};

export type ReviewQueueParams = {
  page?: number;
  pageSize?: number;
};

// ── Mutation bodies ───────────────────────────────────────────────────────────

export type InvalidateRoutingDecisionBody = {
  reason?: string | null;
};

export type PinRoutingDecisionBody = {
  cardSpecKey?: string | null;
  brandCode?: string | null;
  countryCode?: string | null;
  denominationId?: string | null;
  denominationAmount?: number | null;
  denominationCurrency?: string | null;
  cardFormat?: string | null;
  providerId: string;
  allowIneligible?: boolean;
};

export type DispatchRedemptionOrderBody = {
  tradeId: string;
  providerId: string;
};

export type ReassignProviderBody = {
  redemptionOrderId: string;
  newProviderId: string;
  routingDecisionId?: string | null;
};

export type AttachOutcomeBody = {
  inboundMessageId: string;
  redemptionOrderId: string;
  outcome: RedemptionOutcome;
  reasonCode?: string | null;
  reasonText?: string | null;
};

// ── Sourcing · Trade sourcing summary (trade detail panel) ────────────────────
// How a single trade was routed/redeemed to a vendor. Backend enums serialize as STRINGS.
// Mirrors GET /giftcards/v1/admin/sourcing/trades/{tradeId}/summary.
export type TradeCardDto = {
  index: number;
  brandCode: string;
  amount: number;
  currency: string;
  cardFormat: string;
  imageUrl: string | null;
  outcome: "Pending" | "Redeemed" | "Failed" | "Unknown";
  reasonCode: string | null;
  reasonText: string | null;
  outcomeAt: string | null;
  outcomeSource: "Agent" | "Human" | null; // who set it (Phase 3.4); null while pending
  outcomeConfidence: number | null; // agent's confidence when source = Agent
};

export type TradeSourcingSummary = {
  sourced: boolean;
  tradeReference: string | null;
  providerId: string | null;
  providerName: string | null;
  redemptionStatus: string;
  outcome: string | null;
  outcomeReasonCode: string | null;
  outcomeReasonText: string | null;
  vendorComment: string | null;
  quotedRate: number | null;
  quotedCurrency: string | null;
  normalizedUsdPerCard: number | null;
  correlationConfidence: number | null;
  correlationMethod: string | null;
  dispatchedAt: string | null;
  outcomeAt: string | null;
  redemptionOrderId: string | null;
  imagesSent: number; // card images the provider has received …
  imagesTotal: number; // … out of this many (imagesSent < imagesTotal ⇒ header sent, image didn't)
  cards: TradeCardDto[];
};

// ── Sourcing · Nav badge counts ───────────────────────────────────────────────
// Mirrors GET /giftcards/v1/admin/sourcing/badges.
export type SourcingBadges = {
  allocationsPending: number;
  reviewQueue: number;
  awaitingProviders: number;
};

// A trade whose rate discovery expired with no provider reply — the "awaiting providers" queue.
// Mirrors GET /giftcards/v1/admin/sourcing/awaiting-providers.
export type AwaitingProviderItem = {
  tradeId: string;
  rateRequestId: string;
  cardSpecKey: string;
  brandCode: string;
  countryCode: string;
  denominationAmount: number;
  denominationCurrency: string;
  cardFormat: string;
  broadcastProviderCount: number;
  expiredAt: string;
  waitedSeconds: number;
};
