import type { ListTradesParams, ListDenominationsParams, ListRatesParams } from "./types";

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
} as const;
