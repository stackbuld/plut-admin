import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type { PnLAggregateRowDto, RevenueTimeSeriesRowDto } from "./types/ledger-revenue.types";

// docs/ledger-service-docs/admin-console/07-REVENUE_AND_PNL.md
const BASE = "/api/ledger/admin/Revenue";

export type RevenueParams = {
  ledger: string;
  from: string;
  to: string;
  groupBy?: string;
  asset?: string;
  granularity?: string;
};

export const getIncomeStatement = (p: RevenueParams) =>
  apiGet<PnLAggregateRowDto[]>(
    `${BASE}/income-statement${buildQs({ ledger: p.ledger, from: p.from, to: p.to, groupBy: p.groupBy, asset: p.asset })}`,
  );

export const getRevenueBreakdown = (p: RevenueParams) =>
  apiGet<RevenueTimeSeriesRowDto[]>(
    `${BASE}/breakdown${buildQs({
      ledger: p.ledger,
      from: p.from,
      to: p.to,
      groupBy: p.groupBy,
      granularity: p.granularity ?? "day",
      asset: p.asset,
    })}`,
  );

export const revenueKeys = {
  all: () => ["admin", "ledger", "revenue"] as const,
  incomeStatement: (p: RevenueParams) => [...revenueKeys.all(), "income-statement", p] as const,
  breakdown: (p: RevenueParams) => [...revenueKeys.all(), "breakdown", p] as const,
};

export const revenueQueries = {
  incomeStatement: (p: RevenueParams) =>
    queryOptions({
      queryKey: revenueKeys.incomeStatement(p),
      queryFn: () => getIncomeStatement(p),
      staleTime: 15_000,
      enabled: Boolean(p.ledger && p.from && p.to),
    }),
  breakdown: (p: RevenueParams) =>
    queryOptions({
      queryKey: revenueKeys.breakdown(p),
      queryFn: () => getRevenueBreakdown(p),
      staleTime: 15_000,
      enabled: Boolean(p.ledger && p.from && p.to),
    }),
};
