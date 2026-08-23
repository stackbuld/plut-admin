import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarIcon, Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { kycKeys, kycQueries, syncKycCase } from "@/api/kyc";
import type { KycAdminCaseListItem, KycCaseType, KycStatus } from "@/api/types/kyc.types";
import type { KycTier } from "@/api/types/users.types";
import { KycCaseStatusBadge } from "@/components/plut/kyc/KycCaseStatusBadge";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { relativeTime, truncId } from "@/lib/format";

const STATUS_OPTIONS: (KycStatus | "All")[] = [
  "All",
  "Pending",
  "InReview",
  "NeedsInfo",
  "Approved",
  "Rejected",
];

const TIER_OPTIONS = [
  { v: "all", l: "All tiers" },
  { v: "Tier0", l: "Tier 0" },
  { v: "Tier1", l: "Tier 1" },
  { v: "Tier2", l: "Tier 2" },
  { v: "Tier3", l: "Tier 3" },
];

const TYPE_OPTIONS = [
  { v: "User", l: "User" },
  { v: "Business", l: "Business" },
];

const DEFAULT_PAGE_SIZE = 20;

type SearchState = { status?: KycStatus | "All" };

export const Route = createFileRoute("/_app/admin/kyc/cases/")({
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    status: (STATUS_OPTIONS as string[]).includes(s.status as string)
      ? (s.status as KycStatus | "All")
      : "All",
  }),
  component: KycCasesList,
});

function KycCasesList() {
  const { status = "All" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const [tier, setTier] = useState("all");
  const [type, setType] = useState<KycCaseType>("User");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [status, tier, type, dateFrom, dateTo]);

  const listParams = {
    status: status === "All" ? undefined : status,
    tier: tier === "all" ? undefined : (tier as KycTier),
    type,
    page,
    pageSize,
    ...(search ? { search } : {}),
    ...(dateFrom ? { from: dateFrom } : {}),
    ...(dateTo ? { to: dateTo } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(kycQueries.caseList(listParams));

  useEffect(() => {
    if (data && page * pageSize < data.totalItems) {
      qc.prefetchQuery(kycQueries.caseList({ ...listParams, page: page + 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, pageSize, status, tier, type, search, dateFrom, dateTo, qc]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => navigate({ search: { status: s } })}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (status === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground")
            }
          >
            {s === "All" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email, name, case id, or reference"
            className="h-9 pl-9"
          />
        </div>

        <FilterSelect value={tier} onChange={setTier} placeholder="Tier" options={TIER_OPTIONS} />
        <FilterSelect
          value={type}
          onChange={(v) => setType(v as KycCaseType)}
          placeholder="Type"
          options={TYPE_OPTIONS}
        />

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[140px] text-xs"
            title="From date"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="h-9 w-[140px] text-xs"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-muted-foreground hover:text-foreground"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          {isLoading
            ? "Loading…"
            : `${(data?.totalItems ?? 0).toLocaleString()} case${(data?.totalItems ?? 0) === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No cases match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <CaseRow key={c.caseId} c={c} />
          ))}
        </div>
      )}

      {!isLoading && (data?.totalItems ?? 0) > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalItems ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
          noun="case"
        />
      )}
    </div>
  );
}

function CaseRow({ c }: { c: KycAdminCaseListItem }) {
  const qc = useQueryClient();
  const canResync = c.status === "Approved" && c.type === "User";
  const unsynced = canResync && !c.hasPersonalInfo;

  const resync = useMutation({
    mutationFn: () => syncKycCase(c.caseId),
    onSuccess: (r) => {
      toast.success(r.failed > 0 ? "Resync failed." : "Resynced.");
      qc.invalidateQueries({ queryKey: kycKeys.cases() });
      qc.invalidateQueries({ queryKey: kycKeys.stats() });
    },
    onError: (e: Error) => toast.error(e.message || "Resync failed."),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
      <Link to="/admin/kyc/cases/$caseId" params={{ caseId: c.caseId }} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{c.subjectName ?? truncId(c.subjectId)}</p>
          <KycCaseStatusBadge status={c.status} />
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {c.type} · {c.targetTier}
          </span>
          {unsynced && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400"
              title="Approved, but personal info hasn't been synced from the provider yet"
            >
              <AlertTriangle className="h-2.5 w-2.5" /> Not synced
            </span>
          )}
        </div>
        {c.subjectEmail && <p className="mt-1 text-xs text-muted-foreground">{c.subjectEmail}</p>}
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {truncId(c.caseId, 20)} · {c.documentCount} doc{c.documentCount === 1 ? "" : "s"} ·{" "}
          {relativeTime(c.submittedAt)}
        </p>
      </Link>

      {canResync && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => resync.mutate()}
          disabled={resync.isPending}
        >
          {resync.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Resync
        </Button>
      )}
    </div>
  );
}
