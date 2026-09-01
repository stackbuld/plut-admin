import { queryOptions } from "@tanstack/react-query";
import { apiGet, buildQs } from "./client";
import type {
  AccountPageDto,
  LedgerSummaryDto,
  ListAccountsParams,
} from "./types/ledger.types";

// ledger-service's new admin REST layer — see
// docs/ledger-service-docs/admin-console/00-OVERVIEW.md and
// docs/ledger-service-docs/admin-console/02-LEDGERS_AND_ACCOUNTS.md.
const BASE = "/api/ledger/admin";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listLedgers = () => apiGet<LedgerSummaryDto[]>(`${BASE}/Ledgers`);

export const listAccounts = (p: ListAccountsParams) => {
  const params: Record<string, unknown> = { ledger: p.ledger };
  if (p.prefix) params.prefix = p.prefix;
  if (p.cursor) params.cursor = p.cursor;
  if (p.pageSize) params.pageSize = p.pageSize;
  return apiGet<AccountPageDto>(`${BASE}/Accounts${buildQs(params)}`);
};

// ── Query keys & options ─────────────────────────────────────────────────────

export const ledgerKeys = {
  all: () => ["admin", "ledger"] as const,
  ledgers: () => [...ledgerKeys.all(), "ledgers"] as const,
  accounts: () => [...ledgerKeys.all(), "accounts"] as const,
  accountsList: (p: ListAccountsParams) => [...ledgerKeys.accounts(), p] as const,
};

export const ledgerQueries = {
  ledgers: () =>
    queryOptions({
      queryKey: ledgerKeys.ledgers(),
      queryFn: listLedgers,
      staleTime: 60_000,
    }),

  accounts: (p: ListAccountsParams) =>
    queryOptions({
      queryKey: ledgerKeys.accountsList(p),
      queryFn: () => listAccounts(p),
      staleTime: 15_000,
      enabled: Boolean(p.ledger && p.prefix),
    }),
};
