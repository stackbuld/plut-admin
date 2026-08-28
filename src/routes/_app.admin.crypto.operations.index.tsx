import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cryptoOperationQueries } from "@/api/crypto-operations";
import type {
  CryptoOperationStatus,
  CryptoOperationSummaryDto,
  CryptoOperationType,
} from "@/api/types/crypto.types";
import { OperationStatusBadge } from "@/components/plut/crypto/OperationStatusBadge";
import { OperationEntityLink } from "@/components/plut/crypto/OperationEntityLink";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Type options enumerate the actual CryptoOperationType enum values (crypto-service
// Domain/Enums/Enums.cs) — every operation type currently run through the Multi-Step Operations
// framework, not a guessed subset.
const TYPE_OPTIONS: { v: string; l: string }[] = [
  { v: "all", l: "All types" },
  { v: "BinanceSubAccountProvisioning", l: "Sub-Account Provisioning" },
  { v: "BinanceWithdrawalSubmission", l: "Withdrawal Submission" },
  { v: "CryptoBuySettlement", l: "Buy Settlement" },
  { v: "CryptoSellSettlement", l: "Sell Settlement" },
  { v: "CryptoSwapTwoLegExecution", l: "Swap Execution" },
];

const STATUS_VALUES = ["all", "Pending", "Running", "Succeeded", "Failed"] as const;
const STATUS_OPTIONS: { v: string; l: string }[] = STATUS_VALUES.map((v) => ({
  v,
  l: v === "all" ? "All statuses" : v,
}));

const DEFAULT_PAGE_SIZE = 50;

type SearchState = { status?: (typeof STATUS_VALUES)[number] };

export const Route = createFileRoute("/_app/admin/crypto/operations/")({
  // Status is URL-persisted (like the sub-accounts list's own status filter) since it's the axis
  // a future "failed operations" nav badge would deep-link into. Defaults to "Failed" — this
  // screen's primary job (per 09-OPERATIONS_EXPLORER.md §1) is "show me what's currently broken,"
  // not a full unfiltered audit log; switching to "All statuses" is one click away.
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    status: (STATUS_VALUES as readonly string[]).includes(s.status as string)
      ? (s.status as (typeof STATUS_VALUES)[number])
      : "Failed",
  }),
  component: CryptoOperationsList,
});

function CryptoOperationsList() {
  const { status = "Failed" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [status, type]);

  const listParams = {
    ...(type !== "all" ? { type: type as CryptoOperationType } : {}),
    ...(status !== "all" ? { status: status as CryptoOperationStatus } : {}),
    page,
    pageSize,
  };

  const { data, isLoading, isFetching, refetch } = useQuery(
    cryptoOperationQueries.list(listParams),
  );
  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Operations</h1>

        <FilterSelect value={type} onChange={setType} placeholder="Type" options={TYPE_OPTIONS} />
        <FilterSelect
          value={status}
          onChange={(v) => navigate({ search: { status: v as (typeof STATUS_VALUES)[number] } })}
          placeholder="Status"
          options={STATUS_OPTIONS}
        />

        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </Button>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${(data?.totalCount ?? 0).toLocaleString()} operation${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No operations match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((op) => (
            <OperationRow key={op.id} op={op} />
          ))}
        </div>
      )}

      {!isLoading && (data?.totalCount ?? 0) > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
          noun="operation"
        />
      )}
    </div>
  );
}

function OperationRow({ op }: { op: CryptoOperationSummaryDto }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors",
        op.status === "Failed" && "border-destructive/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <Link
          to="/admin/crypto/operations/$operationId"
          params={{ operationId: op.id }}
          className="inline-flex flex-wrap items-center gap-2 hover:underline"
        >
          <span className="text-sm font-semibold">{op.operationType}</span>
          <OperationStatusBadge status={op.status} />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          Entity: <OperationEntityLink operationType={op.operationType} entityRef={op.entityRef} />
        </p>
        {op.failedStep && (
          <p className="mt-1 text-xs text-destructive">Failed step: {op.failedStep}</p>
        )}
      </div>

      <div className="text-right text-[11px] text-muted-foreground">
        <p>Created {relativeTime(op.createdAt)}</p>
        {op.completedAt && <p>Completed {relativeTime(op.completedAt)}</p>}
      </div>
    </div>
  );
}
