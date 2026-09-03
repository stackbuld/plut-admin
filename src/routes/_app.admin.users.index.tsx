import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarIcon, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/plut/StatusBadge";
import { FilterSelect, TablePager } from "@/components/plut/catalog-shared";
import { userQueries } from "@/api";
import type { UserSortField, SortDir, UserStatus, KycTier } from "@/api/types/users.types";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/users/")({
  head: () => ({ meta: [{ title: "All Users — Plut Admin" }] }),
  component: UsersDirectory,
});

const STATUS_OPTIONS = [
  { v: "all", l: "All statuses" },
  { v: "Active", l: "Active" },
  { v: "Pending", l: "Pending" },
  { v: "Suspended", l: "Suspended" },
  { v: "Deactivated", l: "Deactivated" },
];

const TIER_OPTIONS = [
  { v: "all", l: "All tiers" },
  { v: "Tier0", l: "Tier 0" },
  { v: "Tier1", l: "Tier 1" },
  { v: "Tier2", l: "Tier 2" },
  { v: "Tier3", l: "Tier 3" },
];

const COLUMNS: { field: UserSortField; label: string }[] = [
  { field: "displayName", label: "User" },
  { field: "email", label: "Email" },
  { field: "kycTier", label: "KYC Tier" },
  { field: "created", label: "Created" },
  { field: "lastLogin", label: "Last Login" },
];

const DEFAULT_PAGE_SIZE = 20;

function UsersDirectory() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [kycTier, setKycTier] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<UserSortField>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
  }, [status, kycTier, dateFrom, dateTo, sortBy, sortDir]);

  const listParams = {
    page,
    pageSize,
    sortBy,
    sortDir,
    ...(search ? { search } : {}),
    ...(status !== "all" ? { status: status as UserStatus } : {}),
    ...(kycTier !== "all" ? { kycTier: kycTier as KycTier } : {}),
    ...(dateFrom ? { createdFrom: dateFrom } : {}),
    ...(dateTo ? { createdTo: dateTo } : {}),
  };

  const { data, isLoading, isFetching } = useQuery(userQueries.list(listParams));
  const items = data?.items ?? [];

  function toggleSort(field: UserSortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email or name"
            className="h-9 pl-9"
          />
        </div>

        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="Status"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          value={kycTier}
          onChange={setKycTier}
          placeholder="KYC Tier"
          options={TIER_OPTIONS}
        />

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[140px] text-xs"
            title="Signed up from"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="h-9 w-[140px] text-xs"
            title="Signed up to"
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
            : `${(data?.totalCount ?? 0).toLocaleString()} user${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {COLUMNS.map((c) => (
                  <th
                    key={c.field}
                    className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.field)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {c.label}
                      {sortBy === c.field ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr
                    key={u.userId}
                    className="border-b border-border last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/giftcards/users/$userId"
                        params={{ userId: u.userId }}
                        className="font-medium hover:text-primary"
                      >
                        {u.displayName}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{u.userId}</p>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{u.kycTier}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={u.status} dot={false} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
          noun="users"
        />
      </div>
    </div>
  );
}
