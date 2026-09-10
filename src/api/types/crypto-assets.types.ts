// crypto-service admin asset catalogue — /api/crypto/admin/Assets (see src/api/crypto-assets.ts).
//
// Shapes below are verified against the actual shipped C# DTOs (crypto-service), not the earlier
// design doc (docs/wallet-service-docs/crypto-wallet/admin-console/08-ASSETS_AND_NETWORKS.md), whose
// JSON examples predate this implementation. Two confirmed differences from that doc:
//   1. There is no `isTradingEnabled` field anywhere (asset or network level) — the doc's mockup
//      "Trading: ✓" has nothing to bind to server-side. Omitted here rather than guessed at.
//   2. `isDepositEnabledByProvider`/`isWithdrawEnabledByProvider` live on the *network* DTO, not the
//      asset — an asset like USDT has three networks, each with its own provider-reported flags, so
//      there is no single per-asset "provider status" to show; the detail screen renders one
//      provider-reported row per network instead of one block for the whole asset.
//
// Field-naming note (deliberate, from GetAdminCryptoAssetsQuery.cs's own doc-comment): `isEnabled`
// (both here, asset + network) is Plut's own admin-owned kill switch — entirely separate from
// `isDepositEnabledByProvider`/`isWithdrawEnabledByProvider`, which Binance reports and which get
// silently overwritten every 24h by the provider-catalogue refresh job. Never conflate the two in
// the UI: `isEnabled` is the only one with an editable control on this screen.

// ── GET /api/crypto/admin/Assets ─────────────────────────────────────────────
// Full catalogue browse, including disabled assets/networks (unlike the public GET /assets, which
// filters disabled ones out entirely — unusable as this screen's data source since an admin needs to
// see and re-enable something currently hidden from everyone else). No pagination/search query
// params exist server-side; this screen filters client-side over the full returned list.

export type AdminCryptoAssetNetwork = {
  network: string;
  networkFullName: string;
  isDefault: boolean;
  /** Admin-owned kill switch (Plut's own) — editable via the enable/network-enable endpoints below. */
  isEnabled: boolean;
  minWithdrawAmount: number;
  withdrawFee: number;
  minConfirmations: number;
  isMemoRequired: boolean;
  /** Provider-reported (Binance), refreshed every 24h by the catalogue-refresh job. Read-only —
   * there is no admin endpoint that sets these, and setting one here would be silently reverted. */
  isDepositEnabledByProvider: boolean;
  isWithdrawEnabledByProvider: boolean;
};

export type AdminCryptoAsset = {
  asset: string;
  fullName: string;
  logoUrl: string;
  isDirectPair: boolean;
  /** Admin-owned kill switch (Plut's own). `false` hides the asset from GET /assets and blocks new
   * wallet activation/Buy; existing holders can still Sell/Withdraw — a wind-down, not a freeze. */
  isEnabled: boolean;
  networks: AdminCryptoAssetNetwork[];
};

// ── PUT /api/crypto/admin/Assets/{asset}/logo ────────────────────────────────
// Returns the narrower *public* CryptoAssetDto shape (crypto-service's GetCryptoAssetsQuery.cs) —
// confirmed by reading the handler, not assumed. It has no isEnabled/provider-flag fields at all, so
// it cannot be spliced into the admin list cache; callers should invalidate/refetch the admin list
// after a successful logo change rather than trying to merge this response into it.

export type CryptoAssetPublicNetwork = {
  network: string;
  networkFullName: string;
  isDefault: boolean;
  minWithdrawAmount: number;
  withdrawFee: number;
  minConfirmations: number;
  isMemoRequired: boolean;
};

export type CryptoAssetPublic = {
  asset: string;
  fullName: string;
  logoUrl: string;
  isDirectPair: boolean;
  networks: CryptoAssetPublicNetwork[];
};

// ── POST .../enable | disable | networks/{network}/enable | disable ─────────
// All four return the full AdminCryptoAssetDto (unlike the logo endpoint) — safe to splice directly
// into the admin list cache instead of refetching.
