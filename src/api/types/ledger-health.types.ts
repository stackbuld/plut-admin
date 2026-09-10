// docs/ledger-service-docs/admin-console/08-SYSTEM_HEALTH_AND_OPS.md

export type HealthJobRowDto = {
  job: string;
  ledger: string | null;
  lastRunAt: string | null;
  status: string;
  detail: string | null;
};

export type IdempotencyRecordDto = {
  normalizedKey: string;
  region: string;
  ledger: string;
  requestHash: string;
  requestPayload: string;
  responsePayload: string | null;
  ledgerTxId: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
  lastError: string | null;
};
