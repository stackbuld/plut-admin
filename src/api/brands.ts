import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "./client";
import { queryKeys } from "./keys";
import type { BrandListItem, BrandDetail } from "./types";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listBrands = () =>
  apiGet<BrandListItem[]>("/giftcards/v1/admin/brands");

export const getBrand = (id: string) =>
  apiGet<BrandDetail>(`/giftcards/v1/admin/brands/${id}`);

// ── Mutations ─────────────────────────────────────────────────────────────────

export const createBrand = (body: { name: string; code: string; imageUrl?: string }) =>
  apiPost<{ id: string }>("/giftcards/v1/admin/brands", body);

export const updateBrand = (
  id: string,
  body: { name?: string; isActive?: boolean; imageUrl?: string },
) => apiPatch<void>(`/giftcards/v1/admin/brands/${id}`, body);

// ── Query options ─────────────────────────────────────────────────────────────

export const brandQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.brands.list(),
      queryFn: listBrands,
      staleTime: 5 * 60_000, // brands rarely change
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.brands.detail(id),
      queryFn: () => getBrand(id),
      staleTime: 5 * 60_000,
    }),
};
