import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, buildQs } from "./client";
import { queryKeys } from "./keys";
import type {
  PagedResult,
  CountryListItem,
  DenominationListItem,
  ListDenominationsParams,
  CardType,
  RateListItem,
  CreateRateBody,
  ListRatesParams,
  DenominationRateHistoryResult,
  DenominationRatePayouts,
  FxRateItem,
  FxRateHistoryItem,
  StagedFxRateItem,
  PayoutCurrencyItem,
} from "./types";

// ── Countries ────────────────────────────────────────────────────────────────

export const listCountries = () =>
  apiGet<CountryListItem[]>("/giftcards/v1/admin/countries");

export const createCountry = (body: { name: string; code: string; currencyCode: string }) =>
  apiPost<{ id: string }>("/giftcards/v1/admin/countries", body);

export const countryQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.countries.list(),
      queryFn: listCountries,
      staleTime: 10 * 60_000, // countries barely change
    }),
};

// ── Denominations ─────────────────────────────────────────────────────────────

export const listDenominations = (params: ListDenominationsParams = {}) =>
  apiGet<PagedResult<DenominationListItem>>(
    `/giftcards/v1/admin/denominations${buildQs(params)}`,
  );

export const createDenomination = (body: {
  brandId: string;
  countryId: string;
  amount: number;
  currencyCode: string;
  cardType?: CardType;
}) => apiPost<{ id: string }>("/giftcards/v1/admin/denominations", body);

export const activateDenomination = (id: string) =>
  apiPatch<void>(`/giftcards/v1/admin/denominations/${id}/activate`);

export const deactivateDenomination = (id: string) =>
  apiPatch<void>(`/giftcards/v1/admin/denominations/${id}/deactivate`);

/**
 * Soft-deletes a denomination and cascades the deletion to its rates. The denomination and
 * its rates are hidden from all queries and deactivated; nothing is physically removed.
 */
export const deleteDenomination = (id: string) =>
  apiDelete<{ id: string; isDeleted: boolean; deletedAt: string }>(
    `/giftcards/v1/admin/denominations/${id}`,
  );

export const denominationQueries = {
  list: (params?: ListDenominationsParams) =>
    queryOptions({
      queryKey: queryKeys.denominations.list(params),
      queryFn: () => listDenominations(params),
      staleTime: 5 * 60_000,
    }),
};

// ── Rates ─────────────────────────────────────────────────────────────────────

export const listRates = (params: ListRatesParams = {}) =>
  apiGet<PagedResult<RateListItem>>(
    `/giftcards/v1/admin/denomination-rates${buildQs(params)}`,
  );

export const createRate = (body: CreateRateBody) =>
  apiPost<{ rateId: string }>("/giftcards/v1/admin/rates", body);

export const deactivateRate = (id: string) =>
  apiPatch<void>(`/giftcards/v1/admin/rates/${id}/deactivate`);

export const getDenominationRateHistory = (denominationId: string) =>
  apiGet<DenominationRateHistoryResult>(
    `/giftcards/v1/admin/denomination-rates/${denominationId}/history`,
  );

export const getDenominationRatePayouts = (denominationId: string) =>
  apiGet<DenominationRatePayouts>(
    `/giftcards/v1/admin/denomination-rates/${denominationId}/payouts`,
  );

export const rateQueries = {
  list: (params?: ListRatesParams) =>
    queryOptions({
      queryKey: queryKeys.rates.list(params),
      queryFn: () => listRates(params),
      staleTime: 5 * 60_000,
    }),

  history: (denominationId: string) =>
    queryOptions({
      queryKey: queryKeys.rates.history(denominationId),
      queryFn: () => getDenominationRateHistory(denominationId),
      staleTime: 60_000,
    }),

  payouts: (denominationId: string) =>
    queryOptions({
      queryKey: queryKeys.rates.payouts(denominationId),
      queryFn: () => getDenominationRatePayouts(denominationId),
      staleTime: 60_000,
    }),
};

// ── FX Rates ─────────────────────────────────────────────────────────────────

export const listCurrentFxRates = () =>
  apiGet<FxRateItem[]>("/giftcards/v1/admin/fx-rate/all-current");

export const setFxRate = (body: {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source?: string | null;
}) => apiPost<void>("/giftcards/v1/admin/fx-rate", body);

export const getFxRateHistory = (currency = "NGN") =>
  apiGet<FxRateHistoryItem[]>(`/giftcards/v1/admin/fx-rate/history?currency=${currency}`);

// Staged FX rates: fetched from the provider feed but held for manual review. The nightly feed never
// changes the live rate — an admin applies (as-is), overrides (with a manual value), or discards each.
export const listStagedFxRates = () =>
  apiGet<StagedFxRateItem[]>("/giftcards/v1/admin/fx-rate/staged");

export const applyStagedFxRate = (id: string) =>
  apiPost<unknown>(`/giftcards/v1/admin/fx-rate/staged/${id}/apply`);

export const overrideStagedFxRate = (id: string, rate: number) =>
  apiPost<unknown>(`/giftcards/v1/admin/fx-rate/staged/${id}/override`, { rate });

export const discardStagedFxRate = (id: string) =>
  apiPost<unknown>(`/giftcards/v1/admin/fx-rate/staged/${id}/discard`);

export const fxRateQueries = {
  current: () =>
    queryOptions({
      queryKey: queryKeys.fxRates.current(),
      queryFn: listCurrentFxRates,
      staleTime: 60_000,
    }),

  history: (currency = "NGN") =>
    queryOptions({
      queryKey: [...queryKeys.fxRates.all(), "history", currency] as const,
      queryFn: () => getFxRateHistory(currency),
      staleTime: 5 * 60_000,
    }),

  staged: () =>
    queryOptions({
      queryKey: queryKeys.fxRates.staged(),
      queryFn: listStagedFxRates,
      staleTime: 60_000,
    }),
};

// ── Payout Currencies ─────────────────────────────────────────────────────────

export const listPayoutCurrencies = () =>
  apiGet<PayoutCurrencyItem[]>("/giftcards/v1/admin/payout-currencies");

export const createPayoutCurrency = (body: {
  code: string;
  name: string;
  symbol: string;
  initialUsdRate?: number | null;
}) => apiPost<void>("/giftcards/v1/admin/payout-currencies", body);

export const activatePayoutCurrency = (code: string) =>
  apiPatch<void>(`/giftcards/v1/admin/payout-currencies/${code}/activate`);

export const deactivatePayoutCurrency = (code: string) =>
  apiPatch<void>(`/giftcards/v1/admin/payout-currencies/${code}/deactivate`);

export const payoutCurrencyQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.payoutCurrencies.list(),
      queryFn: listPayoutCurrencies,
      staleTime: 10 * 60_000,
    }),
};

// ── Acquisition Currencies ────────────────────────────────────────────────────

export type AcquisitionCurrencyItem = { code: string; name: string; symbol: string };

export const listAcquisitionCurrencies = () =>
  apiGet<AcquisitionCurrencyItem[]>("/giftcards/v1/admin/acquisition-currencies");

export const acquisitionCurrencyQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.acquisitionCurrencies.list(),
      queryFn: listAcquisitionCurrencies,
      staleTime: 30 * 60_000,
    }),
};
