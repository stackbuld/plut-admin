import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiGetRaw, apiPost, buildQs } from "./client";
import type {
  CriticalErrorDetail,
  CriticalErrorsHealth,
  CriticalErrorsPage,
  ListCriticalErrorsParams,
} from "./types/critical-errors.types";

// The notifications module maps these under /api/v1 on the consolidated host.
const BASE = "/api/v1/critical-errors";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listCriticalErrors = (p: ListCriticalErrorsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.module && p.module !== "All") params.module = p.module;
  if (p.severity && p.severity !== "All") params.severity = p.severity;
  if (p.acknowledged !== undefined) params.acknowledged = p.acknowledged;
  params.page = p.page ?? 1;
  params.pageSize = p.pageSize ?? 50;
  return apiGet<CriticalErrorsPage>(`${BASE}${buildQs(params)}`);
};

export const getCriticalError = (id: string) => apiGet<CriticalErrorDetail>(`${BASE}/${id}`);

export const acknowledgeCriticalError = (id: string) => apiPost<void>(`${BASE}/${id}/acknowledge`);

// Anonymous, self-monitoring canary — the one signal that survives even if the
// dashboard's own auth session or the notifications module's DB is broken.
export const getCriticalErrorsHealth = () => apiGetRaw<CriticalErrorsHealth>(`${BASE}/health`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const criticalErrorKeys = {
  all: () => ["admin", "critical-errors"] as const,
  lists: () => [...criticalErrorKeys.all(), "list"] as const,
  list: (params?: ListCriticalErrorsParams) => [...criticalErrorKeys.lists(), params] as const,
  detail: (id: string) => [...criticalErrorKeys.all(), id] as const,
  health: () => [...criticalErrorKeys.all(), "health"] as const,
};

export const criticalErrorQueries = {
  list: (params?: ListCriticalErrorsParams) =>
    queryOptions({
      queryKey: criticalErrorKeys.list(params),
      queryFn: () => listCriticalErrors(params),
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),

  detail: (id: string) =>
    queryOptions<CriticalErrorDetail>({
      queryKey: criticalErrorKeys.detail(id),
      queryFn: () => getCriticalError(id),
      staleTime: 15_000,
    }),

  health: () =>
    queryOptions({
      queryKey: criticalErrorKeys.health(),
      queryFn: getCriticalErrorsHealth,
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),
};
