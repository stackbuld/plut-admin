import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type { HealthJobRowDto, IdempotencyRecordDto } from "./types/ledger-health.types";

// docs/ledger-service-docs/admin-console/08-SYSTEM_HEALTH_AND_OPS.md
const BASE = "/api/ledger/admin/Health";

export const getHealthJobs = () => apiGet<HealthJobRowDto[]>(`${BASE}/jobs`);

export const getIdempotencyBacklog = (ledger?: string, limit = 100) =>
  apiGet<IdempotencyRecordDto[]>(`${BASE}/idempotency-backlog${buildQs({ ledger, limit })}`);

export const healthKeys = {
  all: () => ["admin", "ledger", "health"] as const,
  jobs: () => [...healthKeys.all(), "jobs"] as const,
  backlog: (ledger?: string) => [...healthKeys.all(), "backlog", ledger] as const,
};

export const healthQueries = {
  jobs: () =>
    queryOptions({
      queryKey: healthKeys.jobs(),
      queryFn: getHealthJobs,
      staleTime: 15_000,
    }),
  backlog: (ledger?: string) =>
    queryOptions({
      queryKey: healthKeys.backlog(ledger),
      queryFn: () => getIdempotencyBacklog(ledger),
      staleTime: 15_000,
    }),
};
