import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { rejectCryptoWithdrawal, cryptoWithdrawalKeys } from "@/api/crypto-withdrawals";
import type { AdminCryptoWithdrawal } from "@/api/types/crypto-withdrawals.types";
import { formatCrypto } from "./CryptoWithdrawalStatusBadge";

const MAX = 500;

type Props = {
  withdrawal: AdminCryptoWithdrawal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Backend's RejectWithdrawalRequest(string Reason) is free text, not an enum — a text field,
 * not a dropdown of canned reasons, matching the fiat RejectWithdrawalDialog's own approach. */
export function RejectCryptoWithdrawalDialog({ withdrawal, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, withdrawal?.id]);

  const mutation = useMutation({
    mutationFn: () => rejectCryptoWithdrawal(withdrawal!.id, { reason: reason.trim() }),
    onSuccess: () => {
      toast.success("Withdrawal rejected. Funds returned to the user's available balance.");
      qc.invalidateQueries({ queryKey: cryptoWithdrawalKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapRejectError(e.message)),
  });

  if (!withdrawal) return null;
  const trimmed = reason.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Withdrawal</DialogTitle>
          <DialogDescription>
            {formatCrypto(withdrawal.amount, withdrawal.asset)} on {withdrawal.network}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-secondary/60 px-3 py-2 font-mono text-[11px] text-muted-foreground break-all">
          {withdrawal.destinationAddress}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Rejection reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX))}
            placeholder="e.g. Destination address flagged by compliance."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {reason.length} / {MAX}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Reverses the ledger hold — funds return to the user's available balance immediately.</span>
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

function mapRejectError(code: string): string {
  switch (code) {
    case "CRYPTO_WITHDRAWAL_NOT_FOUND":
      return "Withdrawal not found. It may have been removed.";
    case "CRYPTO_WITHDRAWAL_INVALID_STATUS":
      return "This withdrawal is no longer pending approval. Refresh the list.";
    default:
      return code || "Rejection failed.";
  }
}
