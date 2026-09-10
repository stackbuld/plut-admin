import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, buildQs } from "./client";
import type { CreateCryptoFxRateBody, CryptoFxRateDto } from "./types/crypto-fx-rates.types";

// crypto-service's admin FX-rate surface — /api/crypto/admin/FxRates, same AdminOnly policy +
// { success, data, message } envelope as every other admin fetcher here (see src/api/client.ts).
// Mirrors src/api/catalog.ts's fxRateQueries shape (the closest existing analog — giftcards'
// currency-pair rate table with set + immutable history), per
// docs/wallet-service-docs/crypto-wallet/admin-console/07-FX_RATES.md and 00-OVERVIEW.md §5. This
// is crypto-service's own, separate `CryptoFxRate` table — no shared backend with giftcards' FX.
const BASE = "/api/crypto/admin/FxRates";

// ── Fetchers ──────────────────────────────────────────────────────────────────

/**
 * `includeHistory=true` returns every row (active + deactivated) for every pair in one call —
 * used to build the inline history panel without a request per pair. `includeHistory=false`
 * (default) returns only the currently-active row per pair.
 */
export const listCryptoFxRates = (includeHistory = false) =>
  apiGet<CryptoFxRateDto[]>(`${BASE}${buildQs({ includeHistory })}`);

/** 201 on success; the new row. Deactivates the prior active row for the same pair server-side as
 * part of the same call — no separate deactivate call needed when replacing a rate. `400` if
 * `rate <= 0` (entity-level validation, `CryptoFxRate.Create`). */
export const createCryptoFxRate = (body: CreateCryptoFxRateBody) =>
  apiPost<CryptoFxRateDto>(BASE, body);

/** No body — `adminId` is read server-side from the auth claim, matching every other admin
 * mutation in this module. */
export const deactivateCryptoFxRate = (rateId: string) =>
  apiPatch<void>(`${BASE}/${rateId}/deactivate`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoFxRateKeys = {
  all: () => ["admin", "crypto", "fx-rates"] as const,
  active: () => [...cryptoFxRateKeys.all(), "active"] as const,
  withHistory: () => [...cryptoFxRateKeys.all(), "with-history"] as const,
};

export const cryptoFxRateQueries = {
  // Active-only list for the main table — matches giftcards' fxRateQueries.current() staleTime.
  active: () =>
    queryOptions({
      queryKey: cryptoFxRateKeys.active(),
      queryFn: () => listCryptoFxRates(false),
      staleTime: 60_000,
    }),

  // Full (active + deactivated) list, used to derive each pair's history panel client-side rather
  // than issuing one request per row — there's no dedicated per-pair history endpoint.
  withHistory: () =>
    queryOptions({
      queryKey: cryptoFxRateKeys.withHistory(),
      queryFn: () => listCryptoFxRates(true),
      staleTime: 60_000,
    }),
};
