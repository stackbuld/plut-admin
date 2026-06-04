import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, X, AlertTriangle, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withdrawalQueries } from "@/api/withdrawals";
import { WithdrawalStatusBadge, formatNgn, maskAccount } from "@/components/plut/withdrawals/WithdrawalStatusBadge";
import { ApproveWithdrawalDialog } from "@/components/plut/withdrawals/ApproveWithdrawalDialog";
import { RejectWithdrawalDialog } from "@/components/plut/withdrawals/RejectWithdrawalDialog";
import { formatDateTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/wallets/withdrawals/$withdrawalId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(withdrawalQueries.detail(params.withdrawalId));
  },
  component: WithdrawalDetail,
});

function WithdrawalDetail() {
  const { withdrawalId } = Route.useParams();
  const { data: w, isLoading } = useQuery(withdrawalQueries.detail(withdrawalId));
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  if (isLoading || !w) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = w.status === "PendingApproval";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/admin/wallets/withdrawals/all"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to withdrawals
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <WithdrawalStatusBadge status={w.status} />
            <p className="mt-2 text-sm text-muted-foreground">
              Submitted: {formatDateTime(w.createdAt)}
            </p>
            {w.completedAt && (
              <p className="text-xs text-muted-foreground">
                Completed: {formatDateTime(w.completedAt)}
              </p>
            )}
          </div>
          {w.status === "Successful" && w.approvalMethod === "Manual" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              <BadgeCheck className="h-3 w-3" /> Manually settled by ops
            </span>
          )}
        </div>

        {(w.status === "Rejected" || w.status === "Failed") && w.failureReason && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{w.failureReason}</span>
          </div>
        )}

        <Section title="Amount">
          <Row label="Withdrawal" value={formatNgn(w.amount)} />
          <Row label="Fee" value={formatNgn(w.fee)} />
          <Row label="Total" value={formatNgn(w.totalAmount)} strong />
        </Section>

        <Section title="Destination">
          <Row label="Account Name" value={w.accountName} />
          <Row label="Bank" value={`${w.bankName} (${w.bankCode})`} />
          <Row label="Account No." value={maskAccount(w.accountNumber)} mono />
        </Section>

        <Section title="User Info">
          <Row label="User" value={w.userName} />
          <Row label="User ID" value={truncId(w.userId, 16)} mono />
          <Row label="Wallet ID" value={truncId(w.walletId, 16)} mono />
          <Row label="Wallet Balance" value={formatNgn(w.walletBalance)} mono />
        </Section>

        <Section title="Reference">
          <Row label="Reference" value={w.reference} mono />
          {w.providerReference && (
            <Row label="Provider Ref." value={w.providerReference} mono />
          )}
          <Row label="Est. arrival" value={w.estimatedArrival} />
        </Section>

        {isPending && (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(true)}
              className="flex-1"
            >
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => setApproveOpen(true)} className="flex-1">
              <Check className="h-4 w-4" /> Approve
            </Button>
          </div>
        )}
      </div>

      <ApproveWithdrawalDialog withdrawal={w} open={approveOpen} onOpenChange={setApproveOpen} />
      <RejectWithdrawalDialog withdrawal={w} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-2 divide-y divide-border rounded-lg border bg-background">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={(mono ? "font-mono text-xs " : "") + (strong ? "font-semibold" : "")}>
        {value}
      </span>
    </div>
  );
}