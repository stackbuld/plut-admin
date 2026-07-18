import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./client";
import { queryKeys } from "./keys";
import type {
  ProviderDto,
  CreateMerchantBody,
  UpdateMerchantBody,
  SetMerchantStatusBody,
  AddCapabilityBody,
  AddCapabilitiesBody,
  AddCapabilitiesResult,
} from "./types";

const BASE = "/giftcards/v1/admin/providers";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listMerchants = () => apiGet<ProviderDto[]>(BASE);

export const getMerchant = (id: string) => apiGet<ProviderDto>(`${BASE}/${id}`);

export const createMerchant = (body: CreateMerchantBody) =>
  apiPost<{ id: string }>(BASE, body);

export const updateMerchant = (id: string, body: UpdateMerchantBody) =>
  apiPut<{ id: string }>(`${BASE}/${id}`, body);

export const setMerchantStatus = (id: string, body: SetMerchantStatusBody) =>
  apiPatch<{ id: string; status: string }>(`${BASE}/${id}/status`, body);

export const addMerchantCapability = (id: string, body: AddCapabilityBody) =>
  apiPost<{ capabilityId: string; providerId: string }>(`${BASE}/${id}/capabilities`, body);

// Bulk add — duplicates are skipped server-side (partial success), never blocking the rest.
export const addMerchantCapabilities = (id: string, body: AddCapabilitiesBody) =>
  apiPost<AddCapabilitiesResult>(`${BASE}/${id}/capabilities/bulk`, body);

export const removeMerchantCapability = (id: string, capabilityId: string) =>
  apiDelete<{ providerId: string; capabilityId: string }>(
    `${BASE}/${id}/capabilities/${capabilityId}`,
  );

// ── Queries ───────────────────────────────────────────────────────────────────

export const merchantQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.merchants.list(),
      queryFn: listMerchants,
      staleTime: 60_000,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.merchants.detail(id),
      queryFn: () => getMerchant(id),
      staleTime: 60_000,
    }),
};
