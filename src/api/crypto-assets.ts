import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "./client";
import type { AdminCryptoAsset, CryptoAssetPublic } from "./types/crypto-assets.types";

// crypto-service's admin asset-catalogue surface — /api/crypto/admin/Assets, same AdminOnly policy +
// { success, data, message } envelope as every other admin fetcher here (see src/api/client.ts).
// Mirrors src/api/catalog.ts's fxRateQueries shape (queryOptions factory + plain fetchers), per the
// admin-console overview's cross-cutting API-client convention.
const BASE = "/api/crypto/admin/Assets";

// ── Fetchers ──────────────────────────────────────────────────────────────────

/** Full catalogue, including disabled assets/networks. No query params — this is the only GET on
 * this surface; the detail route re-derives a single asset from this same cached list rather than
 * hitting a (non-existent) per-asset admin endpoint. */
export const listAdminCryptoAssets = () => apiGet<AdminCryptoAsset[]>(BASE);

/** Not touched by the 24h provider catalogue refresh — set once, persists until changed here.
 * Returns the narrower public CryptoAssetDto (no isEnabled/provider fields) — see
 * types/crypto-assets.types.ts. Callers should refetch the admin list after this, not merge it in. */
export const setCryptoAssetLogo = (asset: string, logoUrl: string) =>
  apiPut<CryptoAssetPublic>(`${BASE}/${asset}/logo`, { logoUrl });

export const enableCryptoAsset = (asset: string) =>
  apiPost<AdminCryptoAsset>(`${BASE}/${asset}/enable`);

/** Hides the asset from GET /assets, blocks new activation/Buy. Existing holders can still
 * Sell/Withdraw — a wind-down, not a freeze. */
export const disableCryptoAsset = (asset: string) =>
  apiPost<AdminCryptoAsset>(`${BASE}/${asset}/disable`);

export const enableCryptoAssetNetwork = (asset: string, network: string) =>
  apiPost<AdminCryptoAsset>(`${BASE}/${asset}/networks/${network}/enable`);

export const disableCryptoAssetNetwork = (asset: string, network: string) =>
  apiPost<AdminCryptoAsset>(`${BASE}/${asset}/networks/${network}/disable`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoAssetKeys = {
  all: () => ["admin", "crypto", "assets"] as const,
  list: () => [...cryptoAssetKeys.all(), "list"] as const,
};

export const cryptoAssetQueries = {
  list: () =>
    queryOptions({
      queryKey: cryptoAssetKeys.list(),
      queryFn: listAdminCryptoAssets,
      staleTime: 30_000,
    }),
};

/** Enable/disable (asset- or network-level) all return the full AdminCryptoAssetDto — splice the
 * updated row straight into the cached list instead of refetching, so both the list page and the
 * detail page (which reads from this same cache) update instantly. */
export function patchCryptoAssetInCache(qc: QueryClient, updated: AdminCryptoAsset) {
  qc.setQueryData<AdminCryptoAsset[]>(cryptoAssetKeys.list(), (old) =>
    old ? old.map((a) => (a.asset === updated.asset ? updated : a)) : old,
  );
}
