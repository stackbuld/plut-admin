import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
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
import { retryCryptoWithdrawalSubmission, cryptoWithdrawalKeys } from "@/api/crypto-withdrawals";

/**
 * Retry action for a withdrawal stuck in SweepFailed/PendingBroadcast — distinct from
 * approve/reject because it resumes the multi-step Binance submission operation rather than
 * re-deciding whether the withdrawal should happen at all (04-WITHDRAWALS.md §1/§2). Mirrors
 * OperationActions.tsx's shape: button + confirm dialog + mutation + toast + invalidation.
 */
export function RetryCryptoWithdrawalSubmissionAction({ withdrawalId }: { withdrawalId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="h-3.5 w-3.5" /> Retry Submission
      </Button>
      <RetryDialog withdrawalId={withdrawalId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function RetryDialog({
  withdrawalId,
  open,
  onOpenChange,
}: {
  withdrawalId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => retryCryptoWithdrawalSubmission(withdrawalId),
    onSuccess: () => {
      toast.success("Retry submitted — resuming from whichever step last failed.");
      qc.invalidateQueries({ queryKey: cryptoWithdrawalKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapRetryError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retry Withdrawal Submission</DialogTitle>
          <DialogDescription>
            Resumes this withdrawal's Binance submission at whichever step last failed (sweep or
            broadcast, never both) and updates its status to reflect the outcome. Safe to run
            again if it fails a second time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapRetryError(code: string): string {
  switch (code) {
    case "CRYPTO_WITHDRAWAL_NOT_FOUND":
      return "Withdrawal not found. It may have been removed.";
    case "CRYPTO_WITHDRAWAL_INVALID_STATUS":
      return "This withdrawal is no longer in a retryable state. Refresh the list.";
    default:
      return code || "Retry failed.";
  }
}
