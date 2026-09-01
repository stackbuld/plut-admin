import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import {
  DEFAULT_LIQUIDATION_PROVIDER,
  type LiquidationHistoryRowDto,
  type LiquidationPoolRowDto,
  type PagedLiquidationHistoryDto,
  type ReconcileLiquidationRequest,
} from "./types/crypto-liquidation.types";

// See docs/wallet-service-docs/crypto-wallet/admin-console/15-SELL_ORDERS_AND_LIQUIDATION.md §3 Part B.
const BASE = "/api/crypto/admin/Liquidation";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const getLiquidationPool = (provider: string = DEFAULT_LIQUIDATION_PROVIDER) =>
  apiGet<LiquidationPoolRowDto[]>(`${BASE}/pool${buildQs({ provider })}`);

export const getLiquidationHistory = (
  provider: string = DEFAULT_LIQUIDATION_PROVIDER,
  page = 1,
  pageSize = 50,
) => apiGet<PagedLiquidationHistoryDto>(`${BASE}/history${buildQs({ provider, page, pageSize })}`);

export const reconcileLiquidationBatch = (body: ReconcileLiquidationRequest) =>
  apiPost<LiquidationHistoryRowDto>(`${BASE}/reconcile`, body);

// ── Query keys & options ─────────────────────────────────────────────────────

export const liquidationKeys = {
  all: () => ["admin", "crypto", "liquidation"] as const,
  pool: (provider?: string) => [...liquidationKeys.all(), "pool", provider] as const,
  histories: () => [...liquidationKeys.all(), "history"] as const,
  history: (provider?: string, page?: number, pageSize?: number) =>
    [...liquidationKeys.histories(), provider, page, pageSize] as const,
};

export const liquidationQueries = {
  pool: (provider: string = DEFAULT_LIQUIDATION_PROVIDER) =>
    queryOptions({
      queryKey: liquidationKeys.pool(provider),
      queryFn: () => getLiquidationPool(provider),
      staleTime: 15_000,
    }),

  history: (provider: string = DEFAULT_LIQUIDATION_PROVIDER, page = 1, pageSize = 50) =>
    queryOptions({
      queryKey: liquidationKeys.history(provider, page, pageSize),
      queryFn: () => getLiquidationHistory(provider, page, pageSize),
      staleTime: 15_000,
    }),
};
