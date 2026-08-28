import { queryOptions } from "@tanstack/react-query";
import { apiGet } from "./client";
import type { CryptoWorkerHealthDto } from "./types/crypto-system-health.types";

// crypto-service admin background-worker observability surface — /api/crypto/admin/SystemHealth,
// same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). See
// docs/wallet-service-docs/crypto-wallet/admin-console/12-SYSTEM_HEALTH.md.
const BASE = "/api/crypto/admin/SystemHealth";

// -- Fetchers -----------------------------------------------------------------

export const listCryptoWorkersHealth = () => apiGet<CryptoWorkerHealthDto[]>(`${BASE}/workers`);

// -- Query keys & options -------------------------------------------------------

export const cryptoSystemHealthKeys = {
  all: () => ["admin", "crypto", "system-health"] as const,
  workers: () => [...cryptoSystemHealthKeys.all(), "workers"] as const,
};

export const cryptoSystemHealthQueries = {
  // This screen's entire purpose is "is anything stuck right now" — poll it so the board stays
  // live without a manual refresh (12-SYSTEM_HEALTH.md §2).
  workers: () =>
    queryOptions({
      queryKey: cryptoSystemHealthKeys.workers(),
      queryFn: listCryptoWorkersHealth,
      staleTime: 10_000,
      refetchInterval: 15_000,
    }),
};
