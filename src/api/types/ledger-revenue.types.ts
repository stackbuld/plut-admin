// docs/ledger-service-docs/admin-console/07-REVENUE_AND_PNL.md

export const REVENUE_GROUP_BY = ["Product", "Provider", "Channel"] as const;
export type RevenueGroupBy = (typeof REVENUE_GROUP_BY)[number];

export type PnLAggregateRowDto = {
  groupKey: Record<string, string>;
  assetCode: string;
  revenueTotalMinor: number;
  cogsTotalMinor: number;
  providerFeesTotalMinor: number;
  opexTotalMinor: number;
  otherExpenseTotalMinor: number;
};

export type RevenueTimeSeriesRowDto = {
  bucketStart: string;
  bucketEnd: string;
  groupKey: Record<string, string>;
  assetCode: string;
  revenueFees: number;
  revenueSpread: number;
  revenueCommission: number;
  revenueOther: number;
};
