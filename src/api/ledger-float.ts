import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPut, buildQs } from "./client";
import type { FloatAccountDto } from "./types/ledger-float.types";

// docs/ledger-service-docs/admin-console/03-FLOAT_AND_PREFUNDING.md
const BASE = "/api/ledger/admin/Float";

export const getFloatAccounts = (ledger: string) =>
  apiGet<FloatAccountDto[]>(`${BASE}/accounts${buildQs({ ledger })}`);

export const setFloatThreshold = (ledger: string, account: string, thresholdMinor: number) =>
  apiPut<null>(`${BASE}/accounts/${encodeURIComponent(account)}/threshold${buildQs({ ledger })}`, {
    thresholdMinor,
  });

export const floatKeys = {
  all: () => ["admin", "ledger", "float"] as const,
  accounts: (ledger: string) => [...floatKeys.all(), "accounts", ledger] as const,
};

export const floatQueries = {
  accounts: (ledger: string) =>
    queryOptions({
      queryKey: floatKeys.accounts(ledger),
      queryFn: () => getFloatAccounts(ledger),
      staleTime: 15_000,
      enabled: Boolean(ledger),
    }),
};
