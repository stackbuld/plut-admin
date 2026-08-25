import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cryptoQueries } from "@/api/crypto";
import type { AdminCryptoSubAccountSummary, CryptoKycShareStatus } from "@/api/types/crypto.types";
import { OperationStatusBadge } from "@/components/plut/crypto/OperationStatusBadge";
import {
  BinanceKycStatusBadge,
  isKycShareStatusAttention,
} from "@/components/plut/crypto/BinanceKycStatusBadge";
import { TablePager } from "@/components/plut/catalog-shared";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: (CryptoKycShareStatus | "All")[] = [
  "All",
  "NotSubmitted",
  "Submitted",
  "SubmissionFailed",
  "ProviderPending",
  "ProviderApproved",
  "ProviderRejected",
];

const DEFAULT_PAGE_SIZE = 20;

type SearchState = { status?: CryptoKycShareStatus | "All" };

export const Route = createFileRoute("/_app/admin/crypto/subaccounts/")({
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    status: (STATUS_OPTIONS as string[]).includes(s.status as string)
      ? (s.status as CryptoKycShareStatus | "All")
      : "All",
  }),
  component: CryptoSubAccountsList,
});

function CryptoSubAccountsList() {
  const { status = "All" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const listParams = {
    ...(status !== "All" ? { kycShareStatus: status } : {}),
    page,
    pageSize,
  };

  const { data, isLoading, isFetching } = useQuery(cryptoQueries.list(listParams));

  const items = data?.items ?? [];
  const attention = items.filter(
    (a) => a.latestOperationStatus === "Failed" || isKycShareStatusAttention(a.kycShareStatus),
  );
  const others = items.filter((a) => !attention.includes(a));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {STATUS_OPTIONS.map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => navigate({ search: { status: s } })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
              )}
            >
              {s === "All" ? "All" : prettyStatus(s)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        {isLoading
          ? "Loading…"
          : `${(data?.totalCount ?? 0).toLocaleString()} sub-account${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {attention.length > 0 && (
            <Section title="Needs attention" tone="red">
              {attention.map((a) => (
                <Row key={a.id} a={a} />
              ))}
            </Section>
          )}
          {others.length > 0 && (
            <Section title={attention.length > 0 ? "Other sub-accounts" : "Sub-accounts"}>
              {others.map((a) => (
                <Row key={a.id} a={a} />
              ))}
            </Section>
          )}
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
          noun="sub-account"
        />
      )}
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "red";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3
        className={cn(
          "text-[11px] font-bold uppercase tracking-wider",
          tone === "red" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ a }: { a: AdminCryptoSubAccountSummary }) {
  const attention =
    a.latestOperationStatus === "Failed" || isKycShareStatusAttention(a.kycShareStatus);
  return (
    <Link
      to="/admin/crypto/subaccounts/$userId"
      params={{ userId: a.userId }}
      className={cn(
        "block rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40",
        attention && "border-destructive/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <UserRef userId={a.userId} className="truncate text-sm font-semibold">
              {truncId(a.userId, 22)}
            </UserRef>
            <BinanceKycStatusBadge status={a.kycShareStatus} />
            {a.latestOperationStatus && <OperationStatusBadge status={a.latestOperationStatus} />}
            {attention && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {a.exchangeSubAccountId} · {a.status}
          </p>
          {a.binanceKycRequestNo && (
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              Request {a.binanceKycRequestNo}
            </p>
          )}
        </div>

        <div className="text-right text-[11px] text-muted-foreground">
          <p>Created {relativeTime(a.createdAt)}</p>
          {a.kycSharedAt && <p>KYC shared {relativeTime(a.kycSharedAt)}</p>}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      No sub-accounts found for the selected filter.
    </div>
  );
}

function prettyStatus(s: CryptoKycShareStatus): string {
  switch (s) {
    case "NotSubmitted":
      return "Not Submitted";
    case "SubmissionFailed":
      return "Submission Failed";
    case "ProviderPending":
      return "Binance Reviewing";
    case "ProviderApproved":
      return "Binance Approved";
    case "ProviderRejected":
      return "Binance Rejected";
    default:
      return s;
  }
}
