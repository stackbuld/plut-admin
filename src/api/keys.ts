import type { ListTradesParams, ListDenominationsParams, ListRatesParams, ListUsersParams, ListImageBlacklistParams } from "./types";

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
  },

  fxRates: {
    all: () => ["admin", "fx-rates"] as const,
    current: () => [...queryKeys.fxRates.all(), "current"] as const,
  },

  payoutCurrencies: {
    all: () => ["admin", "payout-currencies"] as const,
    list: () => queryKeys.payoutCurrencies.all(),
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

  stats: {
    dashboard: () => ["admin", "stats", "dashboard"] as const,
  },
} as const;
