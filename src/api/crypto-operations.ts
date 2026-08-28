import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  CryptoOperationDetailDto,
  CryptoOperationSummaryDto,
  ListCryptoOperationsParams,
} from "./types/crypto.types";
import type { PagedResult } from "./types";

// crypto-service's generic Multi-Step Operations admin surface — /api/crypto/admin/Operations/*,
// same AdminOnly policy + { success, data, message } envelope as every other admin fetcher here
// (see src/api/client.ts). This is the cross-cutting view over EVERY operation type (sub-account
// provisioning, withdrawal submission, Buy/Sell/Swap settlement) — not specific to one entity, see
// docs/wallet-service-docs/crypto-wallet/admin-console/09-OPERATIONS_EXPLORER.md.
const BASE = "/api/crypto/admin/Operations";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listCryptoOperations = (p: ListCryptoOperationsParams = {}) => {
  const params: Record<string, unknown> = {};
  if (p.type) params.type = p.type;
  if (p.status) params.status = p.status;
  if (p.page) params.page = p.page;
  if (p.pageSize) params.pageSize = p.pageSize;
  return apiGet<PagedResult<CryptoOperationSummaryDto>>(`${BASE}${buildQs(params)}`);
};

export const getCryptoOperation = (operationId: string) =>
  apiGet<CryptoOperationDetailDto>(`${BASE}/${operationId}`);

/** Resumes from whichever step last failed — the framework's own idempotent-resume guarantee.
 * Use this generic retry only when there's no more specific entity-level retry available (e.g. a
 * Buy/Sell/Swap settlement operation) — sub-account provisioning and (once built) withdrawal
 * submission have their own entity-aware retry endpoints that also update the entity's own status
 * field, which this generic one does not know how to do. */
export const retryCryptoOperation = (operationId: string) =>
  apiPost<CryptoOperationDetailDto>(`${BASE}/${operationId}/retry`);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoOperationKeys = {
  all: () => ["admin", "crypto", "operations"] as const,
  lists: () => [...cryptoOperationKeys.all(), "list"] as const,
  list: (params?: ListCryptoOperationsParams) => [...cryptoOperationKeys.lists(), params] as const,
  detail: (operationId: string) => [...cryptoOperationKeys.all(), operationId] as const,
  failedCount: () => [...cryptoOperationKeys.all(), "failed-count"] as const,
};

export const cryptoOperationQueries = {
  list: (params?: ListCryptoOperationsParams) =>
    queryOptions({
      queryKey: cryptoOperationKeys.list(params),
      queryFn: () => listCryptoOperations(params),
      staleTime: 15_000,
    }),

  detail: (operationId: string) =>
    queryOptions<CryptoOperationDetailDto>({
      queryKey: cryptoOperationKeys.detail(operationId),
      queryFn: () => getCryptoOperation(operationId),
      staleTime: 15_000,
    }),

  /** Cheap (page size 1) count query for a future nav badge — see 00-OVERVIEW.md §4's
   * `useFailedCryptoOperationsCount()`. Not wired into AppShell.tsx yet; exposed here so that
   * wiring is a one-line addition whenever that nav change is made. */
  failedCount: () =>
    queryOptions({
      queryKey: cryptoOperationKeys.failedCount(),
      queryFn: () => listCryptoOperations({ status: "Failed", pageSize: 1 }),
      staleTime: 30_000,
    }),
};
