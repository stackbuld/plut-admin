import type { ListTradesParams, ListDenominationsParams, ListRatesParams, ListUsersParams, ListImageBlacklistParams, ListAiConversationsParams, ListUnmatchedParams, ListRoutingDecisionsParams, ListRedemptionOrdersParams, ReviewQueueParams } from "./types";

/**
 * Centralized query key factory.
 *
 * Hierarchy allows granular invalidation:
 *   queryKeys.trades.all()    → invalidates every trade query
 *   queryKeys.trades.lists()  → invalidates only list queries (not detail)
 *   queryKeys.trades.detail() → invalidates a specific trade
 */
export const queryKeys = {
  trades: {
    all: () => ["admin", "trades"] as const,
    lists: () => [...queryKeys.trades.all(), "list"] as const,
    list: (params?: ListTradesParams) => [...queryKeys.trades.lists(), params] as const,
    detail: (id: string) => [...queryKeys.trades.all(), id] as const,
  },

  brands: {
    all: () => ["admin", "brands"] as const,
    lists: () => [...queryKeys.brands.all(), "list"] as const,
    list: () => queryKeys.brands.lists(),
    detail: (id: string) => [...queryKeys.brands.all(), id] as const,
  },

  countries: {
    all: () => ["admin", "countries"] as const,
    list: () => queryKeys.countries.all(),
  },

  denominations: {
    all: () => ["admin", "denominations"] as const,
    lists: () => [...queryKeys.denominations.all(), "list"] as const,
    list: (params?: ListDenominationsParams) => [...queryKeys.denominations.lists(), params] as const,
  },

  rates: {
    all: () => ["admin", "rates"] as const,
    lists: () => [...queryKeys.rates.all(), "list"] as const,
    list: (params?: ListRatesParams) => [...queryKeys.rates.lists(), params] as const,
    history: (denominationId: string) => [...queryKeys.rates.all(), "history", denominationId] as const,
    payouts: (denominationId: string) => [...queryKeys.rates.all(), "payouts", denominationId] as const,
  },

  fxRates: {
    all: () => ["admin", "fx-rates"] as const,
    current: () => [...queryKeys.fxRates.all(), "current"] as const,
    staged: () => [...queryKeys.fxRates.all(), "staged"] as const,
  },

  payoutCurrencies: {
    all: () => ["admin", "payout-currencies"] as const,
    list: () => queryKeys.payoutCurrencies.all(),
  },

  acquisitionCurrencies: {
    all: () => ["admin", "acquisition-currencies"] as const,
    list: () => queryKeys.acquisitionCurrencies.all(),
  },

  users: {
    all: () => ["admin", "users"] as const,
    lists: () => [...queryKeys.users.all(), "list"] as const,
    list: (params?: ListUsersParams) => [...queryKeys.users.lists(), params] as const,
    detail: (id: string) => [...queryKeys.users.all(), id] as const,
    blocks: (id: string) => [...queryKeys.users.all(), id, "blocks"] as const,
    strikes: (id: string) => [...queryKeys.users.all(), id, "strikes"] as const,
    blacklist: (params?: ListImageBlacklistParams) => [...queryKeys.users.all(), "blacklist", params] as const,
  },

  merchants: {
    all: () => ["admin", "merchants"] as const,
    lists: () => [...queryKeys.merchants.all(), "list"] as const,
    list: () => queryKeys.merchants.lists(),
    detail: (id: string) => [...queryKeys.merchants.all(), id] as const,
  },

  sourcing: {
    all: () => ["admin", "sourcing"] as const,
    unmatchedList: () => [...queryKeys.sourcing.all(), "unmatched"] as const,
    unmatched: (params?: ListUnmatchedParams) => [...queryKeys.sourcing.unmatchedList(), params] as const,
    routingList: () => [...queryKeys.sourcing.all(), "routing"] as const,
    routing: (params?: ListRoutingDecisionsParams) => [...queryKeys.sourcing.routingList(), params] as const,
    redemptionOrdersList: () => [...queryKeys.sourcing.all(), "redemption-orders"] as const,
    redemptionOrders: (params?: ListRedemptionOrdersParams) => [...queryKeys.sourcing.redemptionOrdersList(), params] as const,
    reviewQueueList: () => [...queryKeys.sourcing.all(), "review-queue"] as const,
    reviewQueue: (params?: ReviewQueueParams) => [...queryKeys.sourcing.reviewQueueList(), params] as const,
    teamNumbers: () => [...queryKeys.sourcing.all(), "team-numbers"] as const,
    awaiting: () => [...queryKeys.sourcing.all(), "awaiting-providers"] as const,
    tradeSummary: (tradeId: string) => [...queryKeys.sourcing.all(), "trade-summary", tradeId] as const,
    badges: () => [...queryKeys.sourcing.all(), "badges"] as const,
  },

  stats: {
    dashboard: () => ["admin", "stats", "dashboard"] as const,
  },

  ai: {
    all: () => ["admin", "ai"] as const,
    conversationsList: () => [...queryKeys.ai.all(), "conversations"] as const,
    conversations: (params?: ListAiConversationsParams) => [...queryKeys.ai.conversationsList(), params] as const,
    conversation: (id: string) => [...queryKeys.ai.all(), "conversation", id] as const,
    stats: (days: number) => [...queryKeys.ai.all(), "stats", days] as const,
  },

  waha: {
    all: () => ["admin", "waha"] as const,
    session: () => [...queryKeys.waha.all(), "session"] as const,
    groups: () => [...queryKeys.waha.all(), "groups"] as const,
  },
} as const;
