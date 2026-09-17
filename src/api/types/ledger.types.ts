// ledger-service admin REST layer — /api/ledger/admin/*, the module's first-ever HTTP surface
// (every prior consumer talks gRPC). Same { success, data, message } envelope as every other
// admin fetcher on this frontend (see src/api/client.ts). See
// docs/ledger-service-docs/admin-console/00-OVERVIEW.md and
// docs/ledger-service-docs/admin-console/02-LEDGERS_AND_ACCOUNTS.md.

// ── GET /api/ledger/admin/Ledgers ────────────────────────────────────────────

export type LedgerSummaryDto = {
  name: string;
  domain: string;
  region: string;
  currency: string | null;
};

// ── GET /api/ledger/admin/Accounts?ledger=&prefix=&cursor=&pageSize= ────────
// Cursor-paginated (Formance's own shape) — not page-number-paginated like this platform's usual
// convention, since Formance's REST API is itself cursor-based with no cheap total-count query.

export type LedgerAccountType =
  | "Unknown"
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense"
  | "World";

export type AccountRowDto = {
  account: string;
  type: LedgerAccountType;
  /** Keyed by asset code (e.g. "NGN", "USD") — minor-unit integers. */
  balances: Record<string, number>;
};

export type AccountPageDto = {
  items: AccountRowDto[];
  nextCursor: string | null;
};

export type ListAccountsParams = {
  ledger: string;
  prefix?: string;
  cursor?: string;
  pageSize?: number;
};

// ── GET /api/ledger/admin/Assets ─────────────────────────────────────────────
// The ledger's asset registry (assets.yaml). Read it instead of assuming a currency has 2 decimal
// places: BTC has 8, ETH 18, USDT/USDC 6, XP 0 — and plut-crypto-global is a selectable ledger on
// every screen with a ledger picker.

export type AssetDto = {
  code: string;
  /** Decimal places. Minor units = major x 10^precision. */
  precision: number;
  class: "Fiat" | "Crypto" | "Points" | string;
};
