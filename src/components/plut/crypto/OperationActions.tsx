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
import { retryCryptoKycShare, cryptoKeys } from "@/api/crypto";
import type { CryptoKycShareStatus, CryptoOperationStatus } from "@/api/types/crypto.types";

/**
 * Retry action for a user's Binance sub-account provisioning / KYC-sharing attempt. Mirrors
 * VasTransactionActions.tsx's shape: button + confirm dialog + mutation + toast + targeted
 * invalidation. Shown whenever the KYC share or the underlying operation is in a failed state, or
 * when there's no sub-account row at all yet (userId-only case — see the detail route's 404
 * handling) — the retry-kyc-share endpoint is a safe no-op if the sub-account already fully exists,
 * so it's fine to expose this without precisely distinguishing "resume" vs "already done" client-side.
 */
export function canRetryKycShare(
  kycShareStatus: CryptoKycShareStatus | undefined,
  operationStatus: CryptoOperationStatus | null | undefined,
): boolean {
  return (
    kycShareStatus === "SubmissionFailed" ||
    kycShareStatus === "ProviderRejected" ||
    operationStatus === "Failed"
  );
}

export function OperationActions({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="h-3.5 w-3.5" /> Retry KYC Share
      </Button>
      <RetryDialog userId={userId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function RetryDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => retryCryptoKycShare(userId),
    onSuccess: () => {
      toast.success("Retry submitted — refreshing this user's provisioning status.");
      qc.invalidateQueries({ queryKey: cryptoKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: cryptoKeys.lists() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapRetryError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retry KYC Share</DialogTitle>
          <DialogDescription>
            Resumes this user's provisioning attempt from whichever step last failed, and re-submits
            KYC data to Binance if that step hadn't succeeded yet. If the sub-account is already
            fully provisioned, this is a safe no-op — it just returns the existing record unchanged.
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
  if (code === "CRYPTO_KYC_NOT_ADEQUATE") {
    return "This user's KYC data still doesn't meet Binance's requirements — see the adequacy checklist below.";
  }
  if (code.startsWith("CRYPTO_PROVISIONING_")) {
    return `Retry failed again at ${code.replace("CRYPTO_PROVISIONING_", "")}. Check the step timeline for details.`;
  }
  if (code === "CRYPTO_SUBACCOUNT_NOT_FOUND") {
    return "No sub-account found for this user.";
  }
  return code || "Retry failed.";
}
