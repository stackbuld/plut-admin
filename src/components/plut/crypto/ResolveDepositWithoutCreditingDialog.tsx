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
import {
  resolveUnmatchedCryptoDepositWithoutCrediting,
  cryptoDepositKeys,
} from "@/api/crypto-deposits";
import type { UnmatchedCryptoDepositDto } from "@/api/types/crypto-deposits.types";
import { formatCrypto } from "./CryptoWithdrawalStatusBadge";

const MAX = 500;

type Props = {
  deposit: UnmatchedCryptoDepositDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The other outcome for an unmatched deposit (03-DEPOSITS.md §2) — no funds move, this just marks
 * the row resolved with an audit trail explaining why no one was credited (e.g. a confirmed
 * treasury test transfer, not a user deposit). Free-text notes, required non-empty, matching the
 * RejectCryptoWithdrawalDialog's own reason-field convention.
 */
export function ResolveDepositWithoutCreditingDialog({ deposit, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes("");
  }, [open, deposit?.id]);

  const mutation = useMutation({
    mutationFn: () =>
      resolveUnmatchedCryptoDepositWithoutCrediting(deposit!.id, { notes: notes.trim() }),
    onSuccess: () => {
      toast.success("Deposit marked resolved — no funds were credited.");
      qc.invalidateQueries({ queryKey: cryptoDepositKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapResolveError(e.message)),
  });

  if (!deposit) return null;
  const trimmed = notes.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Without Crediting</DialogTitle>
          <DialogDescription>
            {formatCrypto(deposit.amount, deposit.asset)} on {deposit.network}, seen on{" "}
            <span className="font-mono">{deposit.exchangeSubAccountId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            No user will be credited. Only use this once you've confirmed on Binance that this
            deposit isn't a user's — e.g. a treasury transfer or test deposit.
          </span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="resolve-notes" className="text-sm font-medium">
            Resolution notes <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="resolve-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, MAX))}
            placeholder="e.g. Confirmed with Binance support this was a test transfer from our own treasury account, not a user deposit."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {notes.length} / {MAX}
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
            Confirm Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapResolveError(code: string): string {
  switch (code) {
    case "UNMATCHED_DEPOSIT_NOT_FOUND":
      return "Deposit not found. It may have been removed.";
    case "UNMATCHED_DEPOSIT_ALREADY_RESOLVED":
      return "This deposit was already resolved. Refresh the list.";
    default:
      return code || "Resolution failed.";
  }
}
