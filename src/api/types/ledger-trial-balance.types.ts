// docs/ledger-service-docs/admin-console/06-TRIAL_BALANCE_AND_RECONCILIATION.md

export type TrialBalanceAssetRowDto = {
  assetCode: string;
  assetsMinor: number;
  liabilitiesMinor: number;
  equityMinor: number;
  revenueMinor: number;
  expensesMinor: number;
  worldMinor: number;
  offByMinor: number;
  balanced: boolean;
};

export type TrialBalanceDto = {
  ledger: string;
  asOf: string;
  byAsset: TrialBalanceAssetRowDto[];
  truncated: boolean;
};

export type ManifestDriftRowDto = {
  account: string;
  balances: Record<string, number>;
};

export type ManifestReconciliationDto = {
  ledger: string;
  scannedAt: string;
  inFormanceNotManifest: ManifestDriftRowDto[];
  inManifestNotFormance: string[];
  truncated: boolean;
};
