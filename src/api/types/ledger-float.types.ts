// docs/ledger-service-docs/admin-console/03-FLOAT_AND_PREFUNDING.md

export type FloatAccountStatus = "Critical" | "Low" | "Healthy";

export type FloatAccountDto = {
  account: string;
  balanceMinor: number;
  thresholdMinor: number;
  status: FloatAccountStatus;
  inManifest: boolean;
};
