import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs } from "./client";
import type {
  AdminCryptoWalletDto,
  FreezeCryptoWalletBody,
  ListCryptoWalletsParams,
  SuspendCryptoWalletBody,
} from "./types/crypto-wallets.types";

// crypto-service's admin wallets surface — /api/crypto/admin/Wallets, same AdminOnly policy +
// { success, data, message } envelope as every other admin fetcher here (see src/api/client.ts).
// See docs/wallet-service-docs/crypto-wallet/admin-console/02-WALLETS_AND_USERS.md.
//
// userId-only search (no list-everything mode) — this is a person-scoped lookup ("show me this
// user's crypto wallets"), not a general wallet browser; the doc explicitly says to start with
// userId-only search since that's all the backend supports today.
const BASE = "/api/crypto/admin/Wallets";

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const listCryptoWallets = (params: ListCryptoWalletsParams) =>
  apiGet<AdminCryptoWalletDto[]>(`${BASE}${buildQs(params)}`);

/** Deposits remain allowed by default (allowDeposits defaults true server-side); withdrawals and
 * trades are blocked. Reversible via unfreeze. Freezing "all wallets" is done by looping this call
 * per wallet id client-side — there's no bulk/by-user endpoint. */
export const freezeCryptoWallet = (walletId: string, body: FreezeCryptoWalletBody) =>
  apiPost<void>(`${BASE}/${walletId}/freeze`, body);

export const unfreezeCryptoWallet = (walletId: string) =>
  apiPost<void>(`${BASE}/${walletId}/unfreeze`);

/** All operations blocked, including deposits — fraud/KYC-failure tool, not a routine compliance
 * hold. No `allowDeposits` nuance here (unlike freeze), since Suspended blocks everything by
 * definition. */
export const suspendCryptoWallet = (walletId: string, body: SuspendCryptoWalletBody) =>
  apiPost<void>(`${BASE}/${walletId}/suspend`, body);

// ── Query keys & options ─────────────────────────────────────────────────────

export const cryptoWalletKeys = {
  all: () => ["admin", "crypto", "wallets"] as const,
  lists: () => [...cryptoWalletKeys.all(), "list"] as const,
  list: (params: ListCryptoWalletsParams) => [...cryptoWalletKeys.lists(), params] as const,
};

export const cryptoWalletQueries = {
  byUser: (userId: string) =>
    queryOptions({
      queryKey: cryptoWalletKeys.list({ userId }),
      queryFn: () => listCryptoWallets({ userId }),
      staleTime: 15_000,
      enabled: !!userId,
    }),
};
