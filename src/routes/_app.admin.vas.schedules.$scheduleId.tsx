import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { vasQueries } from "@/api/vas";
import { VasTransactionStatusBadge, formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime, relativeTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/schedules/$scheduleId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.scheduleDetail(params.scheduleId));
  },
  component: VasScheduleDetail,
});

function VasScheduleDetail() {
  const { scheduleId } = Route.useParams();
  const { data, isLoading } = useQuery(vasQueries.scheduleDetail(scheduleId));
  const { data: runHistory, isLoading: historyLoading } = useQuery(
    vasQueries.transactionList({ scheduledTransactionId: scheduleId, pageNumber: 1, pageSize: 10 }),
  );

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { schedule: s, maxFailureCount, lastReminderAt } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/admin/vas/schedules"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to schedules
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{s.nickname ?? s.serviceCategoryId}</p>
            <UserRef userId={s.userId} className="font-mono text-xs text-muted-foreground">
              {truncId(s.userId)}
            </UserRef>
          </div>
          <div className="flex gap-1.5">
            {s.isCancelled && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Cancelled
              </span>
            )}
            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-semibold " +
                (s.isActive
                  ? "bg-success/15 text-success ring-1 ring-success/30"
                  : "bg-muted text-muted-foreground ring-1 ring-border")
              }
            >
              {s.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-border rounded-lg border bg-background">
          <Row label="Category">{s.serviceCategoryId}</Row>
          <Row label="Beneficiary">{s.customerIdentifierValue}</Row>
          <Row label="Amount">{formatVasAmount(s.amount, s.currencyCode)}</Row>
          <Row label="Frequency">{s.frequency}</Row>
          <Row label="Auto-renew">{s.autoRenew ? "Yes" : "No"}</Row>
          <Row label="Next run">{formatDateTime(s.nextRunDate)}</Row>
          <Row label="Last run">
            {s.lastRunDate
              ? `${formatDateTime(s.lastRunDate)} (${s.lastRunStatus ?? "unknown"})`
              : "never"}
          </Row>
          <Row label="Failures">
            {s.failureCount} / {maxFailureCount}
          </Row>
          <Row label="Runs completed">{s.runCount}</Row>
          <Row label="Skip next run">{s.skipNextRun ? "Yes" : "No"}</Row>
          <Row label="End date">{s.endDate ? formatDateTime(s.endDate) : "—"}</Row>
          <Row label="Last reminder sent">
            {lastReminderAt ? formatDateTime(lastReminderAt) : "—"}
          </Row>
          {s.note && <Row label="Note">{s.note}</Row>}
        </div>
      </div>

      <section className="rounded-2xl border bg-card">
        <h3 className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Run history
        </h3>
        {historyLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !runHistory?.items.length ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            This schedule hasn't produced any transactions yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {runHistory.items.map((t) => (
              <Link
                key={t.id}
                to="/admin/vas/transactions/$transactionId"
                params={{ transactionId: t.id }}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-secondary/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <VasTransactionStatusBadge status={t.status} />
                    <span className="text-xs text-muted-foreground">{relativeTime(t.created)}</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {truncId(t.reference, 26)}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatVasAmount(t.amount, t.currencyCode)}
                </span>
              </Link>
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
      <span className="max-w-[60%] text-right font-mono">{children}</span>
    </div>
  );
}
