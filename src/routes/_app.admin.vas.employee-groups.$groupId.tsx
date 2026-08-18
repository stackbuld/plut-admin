import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { vasQueries } from "@/api/vas";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/employee-groups/$groupId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.employeeGroupDetail(params.groupId));
  },
  component: VasEmployeeGroupDetail,
});

function VasEmployeeGroupDetail() {
  const { groupId } = Route.useParams();
  const { data, isLoading } = useQuery(vasQueries.employeeGroupDetail(groupId));

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { group, members } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/admin/vas/employee-groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to employee groups
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{group.name}</p>
            <p className="text-xs text-muted-foreground">{group.serviceCategoryId}</p>
          </div>
          {!group.isActive && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              inactive
            </span>
          )}
        </div>

        <div className="mt-4 divide-y divide-border rounded-lg border bg-background">
          <Row label="Allowance">{formatVasAmount(group.allowanceAmount, group.currencyCode)}</Row>
          <Row label="Frequency">{group.allowanceFrequency ?? "Manual disbursement only"}</Row>
          <Row label="Active members">{group.activeMemberCount}</Row>
          <Row label="Next disbursement">
            {group.nextDisbursementDate ? formatDateTime(group.nextDisbursementDate) : "—"}
          </Row>
          <Row label="Last disbursed">
            {group.lastDisbursedAt ? formatDateTime(group.lastDisbursedAt) : "never"}
          </Row>
        </div>
      </div>

      <section className="rounded-2xl border bg-card">
        <h3 className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Members
        </h3>
        {members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No members in this group.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{m.beneficiaryValue}</p>
                  {m.memberUserId && (
                    <UserRef
                      userId={m.memberUserId}
                      className="font-mono text-[11px] text-muted-foreground"
                    >
                      linked user
                    </UserRef>
                  )}
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                    (m.isActive
                      ? "bg-success/15 text-success ring-1 ring-success/30"
                      : "bg-muted text-muted-foreground ring-1 ring-border")
                  }
                >
                  {m.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}
