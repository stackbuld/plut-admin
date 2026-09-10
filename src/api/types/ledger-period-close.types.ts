// docs/ledger-service-docs/admin-console/10-PERIOD_CLOSE.md

export type PeriodRowDto = {
  period: string;
  closed: boolean;
  closedBy: string | null;
  closedByEmail: string | null;
  closedAt: string | null;
};

export type PeriodCloseResultDto = {
  ledger: string;
  period: string;
  closedAt: string;
};
