import { queryOptions } from "@tanstack/react-query";
import { apiGet, apiPost, buildQs, idempotencyHeader } from "./client";
import type {
  LedgerAdminAuditRowDto,
  PagedLedgerAdminAuditDto,
  PostManualTransferRequest,
  PostTransferResultDto,
  RevertTransactionResultDto,
} from "./types/ledger-corrections.types";

// docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md

export const revertLedgerTransaction = (
  ledger: string,
  reference: string,
  reason: string,
  force: boolean,
) =>
  apiPost<RevertTransactionResultDto>(
    `/api/ledger/admin/Transactions/${encodeURIComponent(reference)}/revert`,
    { ledger, reason, force },
    idempotencyHeader(),
  );

export const postManualTransfer = (request: PostManualTransferRequest) =>
  apiPost<PostTransferResultDto>("/api/ledger/admin/Postings", request, idempotencyHeader());

export const getCorrectionsAudit = (ledger: string | undefined, page: number, pageSize = 50) =>
  apiGet<PagedLedgerAdminAuditDto>(
    `/api/ledger/admin/Corrections/audit${buildQs({ ledger, page, pageSize })}`,
  );

export const correctionsKeys = {
  all: () => ["admin", "ledger", "corrections"] as const,
  audit: (ledger: string | undefined, page: number) =>
    [...correctionsKeys.all(), "audit", ledger, page] as const,
};

export const correctionsQueries = {
  audit: (ledger: string | undefined, page: number) =>
    queryOptions({
      queryKey: correctionsKeys.audit(ledger, page),
      queryFn: () => getCorrectionsAudit(ledger, page),
      staleTime: 10_000,
    }),
};

export type { LedgerAdminAuditRowDto };
