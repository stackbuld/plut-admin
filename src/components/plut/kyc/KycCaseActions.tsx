import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, RotateCcw, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { approveKycCase, kycKeys, rejectKycCase, resetKycCase, syncKycCase } from "@/api/kyc";
import type { GetKycCaseDetailResult } from "@/api/types/kyc.types";

const MAX_REASON = 500;

/**
 * Reset is only meaningful for Approved User-type cases. Approve/Reject are only meaningful for a
 * case InReview (awaiting compliance adjudication). Resync is available for both — for InReview
 * specifically, it lets a reviewer pull in whatever the provider has already captured (NIN/BVN
 * match, document image, liveness selfie) before deciding, rather than deciding blind. A Pending
 * case reaches InReview automatically (the reconciliation poller escalates it once stale — see
 * ReconcilePendingKycHandler backend-side), no manual admin action needed. Mirrors
 * VasTransactionActions.tsx's dialog+mutation+toast+invalidate pattern.
 */
export function KycCaseActions({ kycCase }: { kycCase: GetKycCaseDetailResult }) {
  const [resyncOpen, setResyncOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isUser = kycCase.type === "User";
  const canResync = isUser && (kycCase.status === "Approved" || kycCase.status === "InReview");
  const canReset = isUser && kycCase.status === "Approved";
  const canReview = kycCase.status === "InReview";

  if (!canResync && !canReset && !canReview) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {canReview && (
          <>
            <Button size="sm" onClick={() => setApproveOpen(true)}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </>
        )}
        {canResync && (
          <Button size="sm" variant="outline" onClick={() => setResyncOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> {canReview ? "Sync from provider" : "Resync"}
          </Button>
        )}
        {canReset && (
          <Button size="sm" variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>
      <ResyncDialog caseId={kycCase.caseId} open={resyncOpen} onOpenChange={setResyncOpen} />
      <ResetKycCaseDialog kycCase={kycCase} open={resetOpen} onOpenChange={setResetOpen} />
      <ApproveKycCaseDialog kycCase={kycCase} open={approveOpen} onOpenChange={setApproveOpen} />
      <RejectKycCaseDialog kycCase={kycCase} open={rejectOpen} onOpenChange={setRejectOpen} />
    </>
  );
}

function ApproveKycCaseDialog({
  kycCase,
  open,
  onOpenChange,
}: {
  kycCase: GetKycCaseDetailResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => approveKycCase(kycCase.caseId),
    onSuccess: () => {
      toast.success(
        kycCase.type === "User"
          ? `Approved. The user's tier has been elevated to ${kycCase.targetTier}.`
          : "Approved. The organization has been activated.",
      );
      qc.invalidateQueries({ queryKey: kycKeys.caseDetail(kycCase.caseId) });
      qc.invalidateQueries({ queryKey: kycKeys.cases() });
      qc.invalidateQueries({ queryKey: kycKeys.stats() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapReviewError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve KYC Case</DialogTitle>
          <DialogDescription>
            {kycCase.type === "User"
              ? `This elevates the user to ${kycCase.targetTier} immediately and notifies them.`
              : "This activates the organization for KYB immediately."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectKycCaseDialog({
  kycCase,
  open,
  onOpenChange,
}: {
  kycCase: GetKycCaseDetailResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => rejectKycCase(kycCase.caseId, reason.trim()),
    onSuccess: () => {
      toast.success("Case rejected. The user has been notified and can submit a new case.");
      qc.invalidateQueries({ queryKey: kycKeys.caseDetail(kycCase.caseId) });
      qc.invalidateQueries({ queryKey: kycKeys.cases() });
      qc.invalidateQueries({ queryKey: kycKeys.stats() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapReviewError(e.message)),
  });

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject KYC Case</DialogTitle>
          <DialogDescription>
            The subject sees this reason and can submit a new case to retry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Rejection reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            placeholder="e.g. Selfie does not match ID document."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {reason.length} / {MAX_REASON}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || trimmed.length === 0}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapReviewError(code: string): string {
  switch (code) {
    case "Kyc.CaseNotFound":
      return "Case not found. It may have been deleted.";
    case "Kyc.NotInReview":
      return "This case is no longer awaiting review. Refresh to see its current status.";
    case "Kyc.CaseClosed":
      return "This case is already closed.";
    case "Kyc.CaseConcurrentUpdate":
      return "Another admin just updated this case. Refresh and try again.";
    default:
      return code || "Action failed.";
  }
}

function ResyncDialog({
  caseId,
  open,
  onOpenChange,
}: {
  caseId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => syncKycCase(caseId),
    onSuccess: (r) => {
      if (r.failed > 0) {
        toast.error("Resync failed — check the raw provider response for details.");
      } else {
        toast.success("Personal info resynced from the provider.");
      }
      qc.invalidateQueries({ queryKey: kycKeys.caseDetail(caseId) });
      qc.invalidateQueries({ queryKey: kycKeys.cases() });
      qc.invalidateQueries({ queryKey: kycKeys.stats() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Resync failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resync KYC Case</DialogTitle>
          <DialogDescription>
            Re-fetches this case's verification detail from the provider and updates the stored
            personal info and documents — even if it was already synced.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Resync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetKycCaseDialog({
  kycCase,
  open,
  onOpenChange,
}: {
  kycCase: GetKycCaseDetailResult;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => resetKycCase(kycCase.caseId, reason.trim()),
    onSuccess: () => {
      toast.success("Case reset. The user has been downgraded to Tier0.");
      qc.invalidateQueries({ queryKey: kycKeys.caseDetail(kycCase.caseId) });
      qc.invalidateQueries({ queryKey: kycKeys.cases() });
      qc.invalidateQueries({ queryKey: kycKeys.stats() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapResetError(e.message)),
  });

  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset KYC Case</DialogTitle>
          <DialogDescription>
            Use this when the case's verified data turned out incomplete or wrong and the user needs
            to redo verification from scratch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="reset-reason" className="text-sm font-medium">
            Reset reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reset-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            placeholder="e.g. Address verification returned no data — needs to resubmit Tier2."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {reason.length} / {MAX_REASON}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            This clears the case's documents, wipes the user's synced personal info, and downgrades
            them to Tier0 immediately. They'll need to submit a new case to re-verify. This cannot
            be undone.
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || trimmed.length === 0}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapResetError(code: string): string {
  switch (code) {
    case "Kyc.CaseNotFound":
      return "Case not found. It may have been deleted.";
    case "Kyc.CaseNotApproved":
      return "Only an approved case can be reset. Refresh to see its current status.";
    case "Kyc.ResetNotSupportedForBusiness":
      return "Business (KYB) cases can't be reset.";
    case "Kyc.CaseConcurrentUpdate":
      return "Another admin just updated this case. Refresh and try again.";
    default:
      return code || "Reset failed.";
  }
}
