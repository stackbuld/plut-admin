// docs/ledger-service-docs/admin-console/03-FLOAT_AND_PREFUNDING.md

/**
 * `Unmonitorable` means the account holds no single resolvable asset (e.g. the multi-asset
 * `assets:custody:total`), so a threshold on it can't be evaluated — a configuration problem to
 * clean up, NOT an alert. It used to report as a permanent `Critical`.
 */
export type FloatAccountStatus = "Critical" | "Low" | "Healthy" | "Unmonitorable";

export type FloatAccountDto = {
  account: string;
  balanceMinor: number;
  thresholdMinor: number;
  status: FloatAccountStatus;
  inManifest: boolean;
  assetCode: string | null;
};

// ── GET /api/ledger/admin/Float/operational-accounts?ledger= ─────────────────
// Every account Plut itself operates, whether or not anyone has set a threshold on it — the
// superset the Operational Accounts screen browses. `NotMonitored` is the extra status here:
// the account exists and has a balance, nobody has set a low-balance alert on it yet.

export type OperationalAccountStatus = FloatAccountStatus | "NotMonitored";

/** The account's role, in terms someone without accounting training can act on. */
export type AccountKind = "MoneyWeHold" | "MoneyWeOwe" | "Income" | "Cost" | "Capital" | "Other";

export type OperationalAccountDto = {
  account: string;
  description: string | null;
  category: string | null;
  provider: string | null;
  accountType: "Unknown" | "Asset" | "Liability" | "Equity" | "Revenue" | "Expense" | "World";
  kind: AccountKind;
  /** Money is posted OUT of this account in normal operation, so it can hit zero and start
   *  rejecting real user transactions. These are the accounts worth alerting on. */
  canRunDry: boolean;
  assetCode: string | null;
  /** Decimal places for `assetCode`, from the ledger's asset registry — never assume 2. */
  precision: number;
  balanceMinor: number;
  /** Every asset this account holds, for the multi-asset accounts where `assetCode` is null. */
  balances: Record<string, number>;
  monitored: boolean;
  thresholdMinor: number;
  status: OperationalAccountStatus;
  inManifest: boolean;
};
