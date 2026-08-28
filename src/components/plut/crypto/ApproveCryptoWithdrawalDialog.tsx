import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { approveCryptoWithdrawal, cryptoWithdrawalKeys } from "@/api/crypto-withdrawals";
import type { AdminCryptoWithdrawal } from "@/api/types/crypto-withdrawals.types";
import { formatCrypto } from "./CryptoWithdrawalStatusBadge";

type Props = {
  withdrawal: AdminCryptoWithdrawal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** No body on this endpoint (admin id is read from the auth claim server-side) — unlike fiat's
 * ApproveWithdrawalDialog there's no "how was this paid" choice to make; approving here just
 * queues the withdrawal for the Binance Sync Worker to submit, same as an auto-approved one. */
export function ApproveCryptoWithdrawalDialog({ withdrawal, open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => approveCryptoWithdrawal(withdrawal!.id),
    onSuccess: () => {
      toast.success("Withdrawal approved — queued for on-chain submission.");
      qc.invalidateQueries({ queryKey: cryptoWithdrawalKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapApproveError(e.message)),
  });

  if (!withdrawal) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Withdrawal</DialogTitle>
          <DialogDescription>
            {formatCrypto(withdrawal.amount, withdrawal.asset)} on {withdrawal.network} — this
            queues it for submission by the Binance Sync Worker.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-secondary/60 px-3 py-2 font-mono text-[11px] text-muted-foreground break-all">
          {withdrawal.destinationAddress}
        </div>

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

function mapApproveError(code: string): string {
  switch (code) {
    case "CRYPTO_WITHDRAWAL_NOT_FOUND":
      return "Withdrawal not found. It may have been removed.";
    case "CRYPTO_WITHDRAWAL_INVALID_STATUS":
      return "This withdrawal is no longer pending approval. Refresh the list.";
    default:
      return code || "Approval failed.";
  }
}
