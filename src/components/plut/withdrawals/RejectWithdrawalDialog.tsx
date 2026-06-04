import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rejectWithdrawal, withdrawalKeys } from "@/api/withdrawals";
import type { AdminWithdrawal } from "@/api/types/withdrawals.types";
import { formatNgn } from "./WithdrawalStatusBadge";

const MAX = 500;

type Props = {
  withdrawal: AdminWithdrawal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RejectWithdrawalDialog({ withdrawal, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  useEffect(() => { if (open) setReason(""); }, [open, withdrawal?.withdrawalId]);

  const mutation = useMutation({
    mutationFn: () =>
      rejectWithdrawal(withdrawal!.withdrawalId, { region: "NG", reason: reason.trim() }),
    onSuccess: () => {
      toast.success("Withdrawal rejected. Funds returned to wallet.");
      qc.invalidateQueries({ queryKey: withdrawalKeys.all() });
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
            {withdrawal.userName} · {withdrawal.bankName} · {formatNgn(withdrawal.totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-secondary/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {withdrawal.reference}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Rejection reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX))}
            placeholder="e.g. Suspicious transaction pattern — account under review."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {reason.length} / {MAX}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Funds will be returned to the user's wallet immediately.</span>
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
    case "Withdrawal.NotFound":
      return "Withdrawal not found. It may have been deleted.";
    case "Withdrawal.InvalidStatusForRejection":
      return "This withdrawal is no longer pending. Refresh the list.";
    case "Wallet.ConcurrencyConflict":
      return "Another admin just processed this. Refresh the list.";
    default:
      return code || "Rejection failed.";
  }
}