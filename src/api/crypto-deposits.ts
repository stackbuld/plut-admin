import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  UnmatchedCryptoDepositDto,
  ListUnmatchedCryptoDepositsParams,
  MatchUnmatchedDepositToUserBody,
  MatchUnmatchedDepositResultDto,
  ResolveUnmatchedDepositWithoutCreditingBody,
} from "./types/crypto-deposits.types";

// crypto-service's admin unmatched-deposits surface - /api/crypto/admin/UnmatchedDeposits, same
// AdminOnly policy + { success, data, message } envelope as every other admin fetcher here (see
// src/api/client.ts). See
// docs/wallet-service-docs/crypto-wallet/admin-console/03-DEPOSITS.md.
//
// Matched deposits have no fetcher here - the deposits route's "Matched" tab reuses
// cryptoTransactionQueries (./crypto-transactions.ts, /api/crypto/admin/Transactions) filtered to
// type=Deposit instead, per 03-DEPOSITS.md §2/§3 ("this tab's 'matched' view is that screen
// filtered to Type=Deposit, not a separate data source").
const BASE = "/api/crypto/admin/UnmatchedDeposits";

// -- Fetchers -----------------------------------------------------------------

export const listUnmatchedCryptoDeposits = (p: ListUnmatchedCryptoDepositsParams = {}) =>
  apiGet<UnmatchedCryptoDepositDto[]>(`${BASE}${buildQs({ resolved: p.resolved ?? false })}`);

// 404 (deposit not found) / 409 (already resolved / resolved concurrently) surface via the thrown
// Error's message - map to friendlier copy at the call site, matching the withdrawals dialogs'
// convention, not here.
export const matchUnmatchedCryptoDepositToUser = (
  id: string,
  body: MatchUnmatchedDepositToUserBody,
) => apiPost<MatchUnmatchedDepositResultDto>(`${BASE}/${id}/match-to-user`, body);

export const resolveUnmatchedCryptoDepositWithoutCrediting = (
  id: string,
  body: ResolveUnmatchedDepositWithoutCreditingBody,
) => apiPost<UnmatchedCryptoDepositDto>(`${BASE}/${id}/resolve-without-crediting`, body);

// -- Query keys & options -------------------------------------------------------

export const cryptoDepositKeys = {
  all: () => ["admin", "crypto", "unmatched-deposits"] as const,
  lists: () => [...cryptoDepositKeys.all(), "list"] as const,
  list: (params?: ListUnmatchedCryptoDepositsParams) =>
    [...cryptoDepositKeys.lists(), params?.resolved ?? false] as const,
};

export const cryptoDepositQueries = {
  unmatchedList: (params?: ListUnmatchedCryptoDepositsParams) =>
    queryOptions({
      queryKey: cryptoDepositKeys.list(params),
      queryFn: () => listUnmatchedCryptoDeposits(params),
      staleTime: 15_000,
    }),
};
