import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs, idempotencyHeader } from "./client";
import type { PeriodCloseResultDto, PeriodRowDto } from "./types/ledger-period-close.types";

// docs/ledger-service-docs/admin-console/10-PERIOD_CLOSE.md
const BASE = "/api/ledger/admin/PeriodClose";

export const listPeriods = (ledger: string) =>
  apiGet<PeriodRowDto[]>(`${BASE}/periods${buildQs({ ledger })}`);

export const closePeriod = (ledger: string, period: string) =>
  apiPost<PeriodCloseResultDto>(`${BASE}/${encodeURIComponent(period)}/close${buildQs({ ledger })}`, undefined, idempotencyHeader());

export const periodCloseKeys = {
  all: () => ["admin", "ledger", "period-close"] as const,
  periods: (ledger: string) => [...periodCloseKeys.all(), "periods", ledger] as const,
};

export const periodCloseQueries = {
  periods: (ledger: string) =>
    queryOptions({
      queryKey: periodCloseKeys.periods(ledger),
      queryFn: () => listPeriods(ledger),
      staleTime: 15_000,
      enabled: Boolean(ledger),
    }),
};
