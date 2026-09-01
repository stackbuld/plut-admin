import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type { ManifestReconciliationDto, TrialBalanceDto } from "./types/ledger-trial-balance.types";

// docs/ledger-service-docs/admin-console/06-TRIAL_BALANCE_AND_RECONCILIATION.md

export const getTrialBalance = (ledger: string) =>
  apiGet<TrialBalanceDto>(`/api/ledger/admin/TrialBalance${buildQs({ ledger })}`);

export const scanManifestReconciliation = (ledger: string) =>
  apiPost<ManifestReconciliationDto>(`/api/ledger/admin/Reconciliation/scan${buildQs({ ledger })}`);

export const trialBalanceKeys = {
  all: () => ["admin", "ledger", "trial-balance"] as const,
  detail: (ledger: string) => [...trialBalanceKeys.all(), ledger] as const,
};

export const trialBalanceQueries = {
  detail: (ledger: string) =>
    queryOptions({
      queryKey: trialBalanceKeys.detail(ledger),
      queryFn: () => getTrialBalance(ledger),
      staleTime: 15_000,
      enabled: Boolean(ledger),
    }),
};
