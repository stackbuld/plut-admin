// crypto-service admin unmatched-deposit surface — /api/crypto/admin/UnmatchedDeposits (same
// AdminOnly policy + { success, data, message } envelope as every other admin fetcher here — see
// src/api/client.ts). Shapes verified against
// docs/wallet-service-docs/crypto-wallet/admin-console/03-DEPOSITS.md §3.
//
// This is the single most consequential manual action in the admin console: Binance reported a
// deposit landing on a sub-account that matches no known CryptoSubAccount, so real user funds sit
// unaccounted-for until an admin resolves the row. Crediting the wrong user via match-to-user
// "cannot be automatically undone" (doc's own words) — see MatchDepositToUserDialog for the
// confirmation flow that guards against that.

export type UnmatchedCryptoDepositDto = {
  id: string;
  exchangeDepositId: string;
  exchangeSubAccountId: string;
  asset: string;
  network: string;
  address: string;
  tag: string | null;
  amount: number;
  txHash: string;
  isResolved: boolean;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  firstObservedAt: string;
};

// GET /api/crypto/admin/UnmatchedDeposits?resolved= — defaults to false (unresolved triage queue)
// when omitted, matching the doc's own default.
export type ListUnmatchedCryptoDepositsParams = {
  resolved?: boolean;
};

// POST .../{id}/match-to-user
export type MatchUnmatchedDepositToUserBody = {
  userId: string;
};

// The doc doesn't pin down this result DTO's exact shape (it only says the row is marked resolved
// and the resulting CryptoTransaction is linked) — callers should re-fetch the unmatched list
// after a successful match rather than depend on specific fields here.
export type MatchUnmatchedDepositResultDto = Record<string, unknown>;

// POST .../{id}/resolve-without-crediting
export type ResolveUnmatchedDepositWithoutCreditingBody = {
  notes: string;
};
