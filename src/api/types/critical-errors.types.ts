export type CriticalErrorSeverity = "P1" | "P2";

export type CriticalError = {
  id: string;
  fingerprint: string;
  module: string;
  severity: CriticalErrorSeverity | string;
  message: string;
  operation?: string | null;
  statusCode?: number | null;
  environment: string;
  host?: string | null;
  traceId?: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastForwardedAt?: string | null;
  acknowledged: boolean;
};

export type CriticalErrorDetail = CriticalError & {
  stackTrace?: string | null;
  userId?: string | null;
  httpMethod?: string | null;
  context?: Record<string, string> | null;
};

export type ListCriticalErrorsParams = {
  module?: string;
  severity?: CriticalErrorSeverity | "All";
  acknowledged?: boolean;
  page?: number;
  pageSize?: number;
};

export type CriticalErrorsPage = {
  total: number;
  page: number;
  pageSize: number;
  items: CriticalError[];
};

export type CriticalErrorsHealth = {
  ok: boolean;
  dbReachable: boolean;
  openP1Count: number;
  lastSeenAt?: string | null;
};
