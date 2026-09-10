// crypto-service admin FX-rate surface — /api/crypto/admin/FxRates (Web/Endpoints/AdminFxRates.cs).
// Same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). Shapes verified against
// docs/wallet-service-docs/crypto-wallet/admin-console/07-FX_RATES.md §3.
//
// One row is `1 BaseAsset = Rate FiatCurrency`. BaseAsset is always a direct-pair asset (today:
// USDT only) — this is not a per-crypto-asset rate table; every other asset's fiat price is
// derived from its USDT price times this rate. In practice this means one row per supported fiat
// currency, not one per crypto asset.

export type CryptoFxRateDto = {
  id: string;
  baseAsset: string;
  fiatCurrency: string;
  rate: number;
  source: string;
  validFrom: string;
  /** Non-null only for a superseded/deactivated row — the moment it stopped being the active rate. */
  validTo: string | null;
};

// -- GET /api/crypto/admin/FxRates?includeHistory= ---------------------------
// includeHistory=false (default): only the currently-active row per pair.
// includeHistory=true: every row (active + deactivated) for every pair, in one call — used to
// build the inline history panel without a request per pair.

// -- POST /api/crypto/admin/FxRates -------------------------------------------
// Deactivates the prior active row for the same (baseAsset, fiatCurrency) pair server-side as part
// of the same call — no separate deactivate call needed when replacing a rate. 400 if rate <= 0.

export type CreateCryptoFxRateBody = {
  baseAsset: string;
  fiatCurrency: string;
  rate: number;
};

// -- PATCH /api/crypto/admin/FxRates/{rateId}/deactivate ----------------------
// No body — adminId is read server-side from the auth claim, matching every other admin mutation
// in this module. Deactivating without a replacement leaves the pair with no active rate at all
// (price display shows null; Buy/Sell for that currency fails closed with
// CRYPTO_FX_RATE_NOT_CONFIGURED) until a new rate is set.
