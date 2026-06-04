import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { approveWithdrawal, withdrawalKeys } from "@/api/withdrawals";
import type { AdminWithdrawal, ApprovalMethod } from "@/api/types/withdrawals.types";
import { formatNgn } from "./WithdrawalStatusBadge";

type Props = {
  withdrawal: AdminWithdrawal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApproveWithdrawalDialog({ withdrawal, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<ApprovalMethod>("Provider");

  useEffect(() => { if (open) setMethod("Provider"); }, [open, withdrawal?.withdrawalId]);

  const mutation = useMutation({
    mutationFn: () =>
      approveWithdrawal(withdrawal!.withdrawalId, { region: "NG", method }),
    onSuccess: () => {
      toast.success(
        method === "Manual"
          ? "Withdrawal marked as manually settled."
          : "Withdrawal dispatched to payment provider.",
      );
      qc.invalidateQueries({ queryKey: withdrawalKeys.all() });
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
            {withdrawal.userName} · {withdrawal.bankName} · {formatNgn(withdrawal.totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-secondary/60 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          {withdrawal.reference}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">How was this paid?</p>
          <MethodOption
            value="Provider" current={method} onSelect={setMethod}
            title="Via payment provider"
            sub="Dispatch to Paystack and wait for the webhook confirmation."
          />
          <MethodOption
            value="Manual" current={method} onSelect={setMethod}
            title="Manually (I already transferred)"
            sub="Marks the withdrawal as settled immediately. No webhook will arrive."
          />
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

function MethodOption({
  value, current, onSelect, title, sub,
}: { value: ApprovalMethod; current: ApprovalMethod; onSelect: (m: ApprovalMethod) => void; title: string; sub: string }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors " +
        (active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60")
      }
    >
      <span className={"mt-0.5 grid h-4 w-4 place-items-center rounded-full border " + (active ? "border-primary" : "border-muted-foreground")}>
        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

function mapApproveError(code: string): string {
  switch (code) {
    case "Withdrawal.NotFound":
      return "Withdrawal not found. It may have been deleted.";
    case "Withdrawal.InvalidStatusForApproval":
      return "This withdrawal is no longer pending. Refresh the list.";
    case "Wallet.ConcurrencyConflict":
      return "Another admin just processed this. Refresh the list.";
    default:
      return code || "Approval failed.";
  }
}