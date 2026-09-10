import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  SearchX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cryptoWithdrawalQueries } from "@/api/crypto-withdrawals";
import {
  CryptoWithdrawalStatusBadge,
  canRetryCryptoWithdrawalSubmission,
  formatCrypto,
} from "@/components/plut/crypto/CryptoWithdrawalStatusBadge";
import { ApproveCryptoWithdrawalDialog } from "@/components/plut/crypto/ApproveCryptoWithdrawalDialog";
import { RejectCryptoWithdrawalDialog } from "@/components/plut/crypto/RejectCryptoWithdrawalDialog";
import { RetryCryptoWithdrawalSubmissionAction } from "@/components/plut/crypto/RetryCryptoWithdrawalSubmissionAction";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime, truncId } from "@/lib/format";

// No dedicated GET /Withdrawals/{id} exists on this admin surface (confirmed against
// Web/Endpoints/Withdrawals.cs's AdminWithdrawals group — only List, Approve, Reject and
// RetrySubmission are mapped there). This route finds the withdrawal from the already-fetched
// unfiltered list query by id, exactly as 04-WITHDRAWALS.md's note instructs, rather than
// assuming a single-item endpoint exists.
export const Route = createFileRoute("/_app/admin/crypto/withdrawals/$withdrawalId")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(cryptoWithdrawalQueries.list({ pendingOnly: false }));
  },
  component: CryptoWithdrawalDetail,
});

function CryptoWithdrawalDetail() {
  const { withdrawalId } = Route.useParams();
  const { data, isLoading, isFetching, refetch } = useQuery(
    cryptoWithdrawalQueries.list({ pendingOnly: false }),
  );
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const backLink = (
    <Link
      to="/admin/crypto/withdrawals"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to withdrawals
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {backLink}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const w = data?.find((x) => x.id === withdrawalId);

  if (!w) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {backLink}
        <div className="rounded-2xl border bg-card p-8 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Withdrawal not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            It isn't in the current withdrawals list — it may have been removed, or the list may be
            stale.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Refresh list
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPending = w.status === "PendingApproval";
  const canRetry = canRetryCryptoWithdrawalSubmission(w.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {backLink}

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{formatCrypto(w.amount, w.asset)}</span>
              <CryptoWithdrawalStatusBadge status={w.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {w.approvalMethod === "Manual" ? "Manual approval" : `Approval: ${w.approvalMethod}`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Created: {formatDateTime(w.createdAt)}</p>
          </div>
        </div>

        <StatusNote status={w.status} />

        <Section title="User">
          <Row
            label="User"
            value={
              <UserRef userId={w.userId} className="font-mono text-xs text-primary hover:underline">
                {truncId(w.userId, 22)}
              </UserRef>
            }
          />
        </Section>

        <Section title="Asset / Network">
          <Row label="Asset" value={w.asset} />
          <Row label="Network" value={w.network} />
        </Section>

        <Section title="Destination">
          <Row label="Address" value={<CopyableValue value={w.destinationAddress} />} />
          <Row label="Tag / Memo" value={w.destinationTag ?? "—"} mono />
        </Section>

        <Section title="Amount">
          <Row label="Amount" value={formatCrypto(w.amount, w.asset)} />
          <Row
            label="Network Fee"
            value={formatCrypto(w.networkFee, w.asset)}
            hint="pass-through — not Plut's"
          />
          <Row
            label="Platform Fee"
            value={formatCrypto(w.platformFee, w.asset)}
            hint="Plut revenue"
          />
          <Row label="Total Deducted" value={formatCrypto(w.totalDeducted, w.asset)} strong />
        </Section>

        {isPending && (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setRejectOpen(true)} className="flex-1">
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => setApproveOpen(true)} className="flex-1">
              <Check className="h-4 w-4" /> Approve
            </Button>
          </div>
        )}

        {canRetry && (
          <div className="mt-6 flex justify-end">
            <RetryCryptoWithdrawalSubmissionAction withdrawalId={w.id} />
          </div>
        )}
      </div>

      <ApproveCryptoWithdrawalDialog withdrawal={w} open={approveOpen} onOpenChange={setApproveOpen} />
      <RejectCryptoWithdrawalDialog withdrawal={w} open={rejectOpen} onOpenChange={setRejectOpen} />
    </div>
  );
}

/** Status-specific context. Kept deliberately light on claimed detail: AdminCryptoWithdrawalDto
 * (confirmed against Application/CryptoWithdrawals/GetCryptoWithdrawalsQuery.cs) does not expose a
 * rejection reason, a failure reason, or a TxHash — unlike the design doc's mockup, which assumed
 * those fields exist on this endpoint. Nothing to render for them until the backend adds them; this
 * note says so plainly rather than fabricating a field that isn't there. */
function StatusNote({ status }: { status: string }) {
  if (status === "SweepFailed" || status === "PendingBroadcast") {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="flex-1">
          The automated submission pipeline (Binance Sync Worker) tried and didn't finish. Use{" "}
          <strong>Retry Submission</strong> below to resume from whichever step last failed — this
          is a different action from approve/reject and won't re-decide whether the withdrawal
          should happen.{" "}
          <Link
            to="/admin/crypto/operations"
            search={{ status: "Failed" }}
            className="inline-flex items-center gap-0.5 font-semibold underline"
          >
            View in Operations Explorer <ChevronRight className="h-3 w-3" />
          </Link>{" "}
          (filter by type "Withdrawal Submission" — this endpoint doesn't return the operation id
          directly, so it can't deep-link to the exact record).
        </span>
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground">
        This withdrawal was rejected. The admin who rejected it and their reason aren't returned by
        this endpoint today — only the status itself.
      </div>
    );
  }

  if (status === "Successful") {
    return (
      <div className="mt-4 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success">
        Broadcast succeeded. This endpoint doesn't return the on-chain transaction hash — check the
        underlying Binance withdrawal record or Operations Explorer step output for it.
      </div>
    );
  }

  if (status === "Failed" || status === "Reversed") {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This withdrawal did not complete successfully. A failure reason isn't exposed by this
          endpoint — check Operations Explorer for the underlying step error.
        </span>
      </div>
    );
  }

  return null;
}

function CopyableValue({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="break-all font-mono text-xs">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("Copied");
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        title="Copy"
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2 divide-y divide-border rounded-lg border bg-background">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  mono,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-muted-foreground/70">({hint})</span>}
      </span>
      <span className={(mono ? "font-mono text-xs " : "") + (strong ? "font-semibold" : "")}>
        {value}
      </span>
    </div>
  );
}
