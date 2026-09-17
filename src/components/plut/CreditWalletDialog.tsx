import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { creditWallet, walletKeys } from "@/api/wallets";
import { ledgerQueries } from "@/api/ledger";
import { floatQueries } from "@/api/ledger-float";
import { currencySymbol } from "@/lib/format";
import { formatMinor, toMinorString } from "@/lib/money";

const NARRATION_MAX = 500;

type Props = {
  walletId: string | null;
  userName?: string | null;
  currency?: string;
  availableBalance?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreditWalletDialog({
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

  // A credit is paid out of the admin-adjustment budget, not minted — so show what's actually left
  // in it before the operator types an amount, rather than letting them find out by being rejected.
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const coreLedger =
    ledgers?.find((l) => l.domain === "Core" && l.currency === currency)?.name ?? "";
  const { data: operational } = useQuery({
    ...floatQueries.operational(coreLedger),
    enabled: open && Boolean(coreLedger),
  });

  const budget = useMemo(
    () =>
      operational?.find((a) => a.account === `expenses:admin_adjustment:${currency.toLowerCase()}`),
    [operational, currency],
  );

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

  // Exact comparison against the remaining budget — the ledger will reject an over-draw anyway,
  // this just says so before the round trip.
  const amountMinor = budget ? toMinorString(amount, budget.precision) : null;
  const overBudget =
    budget !== undefined &&
    amountMinor !== null &&
    BigInt(amountMinor) > BigInt(budget.balanceMinor);

  const mutation = useMutation({
    mutationFn: () =>
      creditWallet(walletId!, {
        amount: amountValue,
        currency,
        narration: trimmedNarration,
        idempotencyKey,
      }),
    onSuccess: () => {
      toast.success("Wallet credited successfully.");
      qc.invalidateQueries({ queryKey: walletKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapCreditError(e.message)),
  });

  if (!walletId) return null;

  const canSubmit = !mutation.isPending && isValidAmount && trimmedNarration.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Credit Wallet</DialogTitle>
          <DialogDescription>
            {userName ? `${userName} · ` : ""}
            {availableBalance !== undefined
              ? `Available balance: ${currencySymbol(currency)}${availableBalance.toLocaleString()}`
              : "Immediately adds funds to this wallet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="credit-amount" className="text-sm font-medium">
            Amount ({currency}) <span className="text-destructive">*</span>
          </label>
          <Input
            id="credit-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={mutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="credit-narration" className="text-sm font-medium">
            Narration <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="credit-narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value.slice(0, NARRATION_MAX))}
            placeholder="e.g. Goodwill credit for delayed withdrawal on 2026-08-20."
            rows={4}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {narration.length} / {NARRATION_MAX}
          </div>
        </div>

        {budget && (
          <div
            className={
              overBudget
                ? "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                : "flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"
            }
          >
            {overBudget ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>
              This is paid out of the admin adjustment budget, which holds{" "}
              <strong>
                {formatMinor(budget.balanceMinor, budget.assetCode, budget.precision)}
              </strong>
              .
              {overBudget
                ? " That's less than this credit — top the budget up under Ledger → Operational Accounts first."
                : ""}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            This credits the wallet immediately and notifies the user (email) with the narration
            above.
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapCreditError(code: string): string {
  switch (code) {
    case "Wallet.NotFound":
      return "Wallet not found. It may have been deleted.";
    case "Wallet.NotActive":
      return "This wallet is frozen and cannot be credited.";
    case "Wallet.ConcurrencyConflict":
      return "Another admin just modified this wallet. Refresh and try again.";
    case "Wallet.CurrencyMismatch":
      return "Currency doesn't match this wallet. Refresh and try again.";
    case "Wallet.AdjustmentBudgetExhausted":
      return "The admin adjustment budget can't cover this credit. Top it up under Ledger → Operational Accounts, then try again.";
    case "Transaction.InvalidAmount":
      return "Amount must be greater than zero.";
    case "Transaction.InvalidAmountPrecision":
      return "Amount can have at most 2 decimal places.";
    default:
      return code || "Credit failed.";
  }
}
