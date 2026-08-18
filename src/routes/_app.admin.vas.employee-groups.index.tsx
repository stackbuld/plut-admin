import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { vasQueries } from "@/api/vas";
import type { VasEmployeeGroup } from "@/api/types/vas.types";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { formatDateTime, relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/employee-groups/")({
  component: VasEmployeeGroupsList,
});

function VasEmployeeGroupsList() {
  const [businessIdInput, setBusinessIdInput] = useState("");
  const [businessId, setBusinessId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBusinessId(businessIdInput.trim()), 400);
    return () => clearTimeout(t);
  }, [businessIdInput]);

  const { data, isLoading } = useQuery(vasQueries.employeeGroupList(businessId || undefined));

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={businessIdInput}
          onChange={(e) => setBusinessIdInput(e.target.value)}
          placeholder="Filter by business id"
          className="h-9 pl-9 font-mono text-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No employee groups found.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((g) => (
            <GroupRow key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupRow({ group: g }: { group: VasEmployeeGroup }) {
  return (
    <Link
      to="/admin/vas/employee-groups/$groupId"
      params={{ groupId: g.id }}
      className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{g.name}</p>
          {!g.isActive && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              inactive
            </span>
          )}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {g.serviceCategoryId}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {g.activeMemberCount} active member{g.activeMemberCount === 1 ? "" : "s"}
          {g.allowanceFrequency
            ? ` · ${g.allowanceFrequency} allowance`
            : " · manual disbursement only"}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {g.lastDisbursedAt
            ? `last disbursed ${relativeTime(g.lastDisbursedAt)}`
            : "never disbursed"}
          {g.nextDisbursementDate ? ` · next ${formatDateTime(g.nextDisbursementDate)}` : ""}
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-base font-semibold">
          {formatVasAmount(g.allowanceAmount, g.currencyCode)}
        </p>
        <p className="text-[11px] text-muted-foreground">per member</p>
      </div>
    </Link>
  );
}
