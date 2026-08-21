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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { debitWallet, walletKeys } from "@/api/wallets";
import { currencySymbol } from "@/lib/format";

const NARRATION_MAX = 500;

type Props = {
  walletId: string | null;
  userName?: string | null;
  currency?: string;
  availableBalance?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DebitWalletDialog({
  walletId,
  userName,
  currency = "NGN",
  availableBalance,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setNarration("");
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [open, walletId]);

  const amountValue = Number(amount);
  const isValidAmount = Number.isFinite(amountValue) && amountValue > 0;
  const trimmedNarration = narration.trim();
  const exceedsBalance = availableBalance !== undefined && amountValue > availableBalance;

  const mutation = useMutation({
    mutationFn: () =>
      debitWallet(walletId!, {
        amount: amountValue,
        currency,
        narration: trimmedNarration,
        idempotencyKey,
      }),
    onSuccess: () => {
      toast.success("Wallet debited successfully.");
      qc.invalidateQueries({ queryKey: walletKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapDebitError(e.message)),
  });

  if (!walletId) return null;

  const canSubmit =
    !mutation.isPending && isValidAmount && trimmedNarration.length > 0 && !exceedsBalance;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Debit Wallet</DialogTitle>
          <DialogDescription>
            {userName ? `${userName} · ` : ""}
            {availableBalance !== undefined
              ? `Available balance: ${currencySymbol(currency)}${availableBalance.toLocaleString()}`
              : "Immediately removes funds from this wallet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="debit-amount" className="text-sm font-medium">
            Amount ({currency}) <span className="text-destructive">*</span>
          </label>
          <Input
            id="debit-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={mutation.isPending}
          />
          {exceedsBalance && (
            <p className="text-[11px] text-destructive">Amount exceeds available balance.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="debit-narration" className="text-sm font-medium">
            Narration <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="debit-narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value.slice(0, NARRATION_MAX))}
            placeholder="e.g. Reversing erroneous credit from 2026-08-20."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {narration.length} / {NARRATION_MAX}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>This debits the wallet immediately and cannot be undone from here.</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Debit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapDebitError(code: string): string {
  switch (code) {
    case "Wallet.NotFound":
      return "Wallet not found. It may have been deleted.";
    case "Wallet.InsufficientFunds":
      return "Insufficient wallet balance for this debit.";
    case "Wallet.NotActive":
      return "This wallet is frozen and cannot be debited.";
    case "Wallet.ConcurrencyConflict":
      return "Another admin just modified this wallet. Refresh and try again.";
    case "Wallet.CurrencyMismatch":
      return "Currency doesn't match this wallet. Refresh and try again.";
    case "Transaction.InvalidAmount":
      return "Amount must be greater than zero.";
    case "Transaction.InvalidAmountPrecision":
      return "Amount can have at most 2 decimal places.";
    default:
      return code || "Debit failed.";
  }
}
