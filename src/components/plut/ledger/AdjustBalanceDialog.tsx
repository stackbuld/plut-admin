import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Info, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postManualTransfer } from "@/api/ledger-corrections";
import { floatKeys } from "@/api/ledger-float";
import type { OperationalAccountDto } from "@/api/types/ledger-float.types";
import type { ManualPostingType } from "@/api/types/ledger-corrections.types";
import {
  addMinor,
  exceedsPrecision,
  formatMinor,
  isNegativeMinor,
  negateMinor,
  toMinorString,
} from "@/lib/money";
import { cn } from "@/lib/utils";
import { AccountPicker } from "./AccountPicker";
import { accountName } from "./account-labels";

/**
 * Top up or draw down one operational account, without the operator having to think in postings.
 *
 * The underlying primitive is a double-entry transfer: money always moves BETWEEN two accounts,
 * never appears or vanishes. That's non-negotiable, so this dialog doesn't hide it — it picks the
 * sensible counterparty for you (`world`, i.e. outside Plut, which is how float seeds have always
 * worked) and states in a sentence what will happen, with the other side changeable if you need it.
 *
 * Direction maps to the ledger primitive as:
 *   Top up      → world → this account, posted as PROVIDER_FLOAT_SEED
 *   Draw down   → this account → world, posted as CORRECTION
 * Both are already in the server's allow-list of admin-safe transaction types, and both are audited
 * with the required reason — this adds no new posting power, just a comprehensible front end to it.
 */
type Direction = "topUp" | "drawDown";

export function AdjustBalanceDialog({
  ledger,
  account,
  open,
  onOpenChange,
}: {
  ledger: string;
  account: OperationalAccountDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<Direction>("topUp");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [counterparty, setCounterparty] = useState("world");
  const [showCounterparty, setShowCounterparty] = useState(false);

  const reset = () => {
    setDirection("topUp");
    setAmount("");
    setReason("");
    setCounterparty("world");
    setShowCounterparty(false);
  };

  const assetCode = account?.assetCode ?? null;
  const precision = account?.precision ?? 2;
  // Exact, string-based — never `amount * 10 ** precision`, which is already inexact at ETH scale.
  const amountMinor = toMinorString(amount, precision);
  const amountIsValid = amountMinor !== null && amountMinor !== "0";
  const tooPrecise = exceedsPrecision(amount, precision);

  const mutation = useMutation({
    mutationFn: () => {
      if (!account || !assetCode || amountMinor === null)
        throw new Error("This account holds no single asset.");
      const isTopUp = direction === "topUp";
      return postManualTransfer({
        ledger,
        type: (isTopUp ? "ProviderFloatSeed" : "Correction") satisfies ManualPostingType,
        source: isTopUp ? counterparty : account.account,
        destination: isTopUp ? account.account : counterparty,
        amountMinor,
        asset: assetCode,
        reason: reason.trim(),
      });
    },
    onSuccess: (result) => {
      toast.success(`Done — ledger transaction ${result.ledgerTxId}.`);
      qc.invalidateQueries({ queryKey: floatKeys.all() });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapAdjustError(e.message)),
  });

  if (!account) return null;

  const canSubmit =
    Boolean(assetCode) &&
    amountIsValid &&
    !tooPrecise &&
    reason.trim().length > 0 &&
    !mutation.isPending;

  const isTopUp = direction === "topUp";
  const delta = amountMinor ?? "0";
  const newBalanceMinor = addMinor(account.balanceMinor, isTopUp ? delta : negateMinor(delta));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust {accountName(account)}</DialogTitle>
          <DialogDescription>
            Holds {formatMinor(account.balanceMinor, assetCode, precision)} right now ·{" "}
            <span className="font-mono text-[11px]">{account.account}</span>
          </DialogDescription>
        </DialogHeader>

        {!assetCode ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            This account holds several different assets at once, so there's no single balance to
            adjust here. Use Corrections → Post a transfer and choose the asset explicitly.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <DirectionButton
                active={isTopUp}
                onClick={() => setDirection("topUp")}
                icon={<ArrowDownLeft className="h-4 w-4" />}
                label="Add money"
                help="Put funds into this account"
              />
              <DirectionButton
                active={!isTopUp}
                onClick={() => setDirection("drawDown")}
                icon={<ArrowUpRight className="h-4 w-4" />}
                label="Take money out"
                help="Remove funds from this account"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="adjust-amount">Amount ({assetCode})</Label>
              <Input
                id="adjust-amount"
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={mutation.isPending}
              />
              {tooPrecise && (
                <p className="text-[11px] text-destructive">
                  {assetCode} supports at most {precision} decimal place{precision === 1 ? "" : "s"}
                  .
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="adjust-reason">Why are you doing this?</Label>
              <Textarea
                id="adjust-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Topping up the Paystack float ahead of the weekend."
                disabled={mutation.isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                Required. Stored permanently against this adjustment, with your name.
              </p>
            </div>

            {amountIsValid && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {isTopUp ? (
                    <>
                      <strong>{formatMinor(delta, assetCode, precision)}</strong> moves into this
                      account from{" "}
                      {counterparty === "world" ? (
                        "outside Plut"
                      ) : (
                        <span className="font-mono">{counterparty}</span>
                      )}
                      .
                    </>
                  ) : (
                    <>
                      <strong>{formatMinor(delta, assetCode, precision)}</strong> moves out of this
                      account to{" "}
                      {counterparty === "world" ? (
                        "outside Plut"
                      ) : (
                        <span className="font-mono">{counterparty}</span>
                      )}
                      .
                    </>
                  )}{" "}
                  Its balance becomes{" "}
                  <strong>{formatMinor(newBalanceMinor, assetCode, precision)}</strong>.
                  {isNegativeMinor(newBalanceMinor) && (
                    <> This would take it below zero, which the ledger will reject.</>
                  )}
                </span>
              </div>
            )}

            {showCounterparty ? (
              <div className="grid gap-1.5">
                <Label>{isTopUp ? "Where the money comes from" : "Where the money goes"}</Label>
                <AccountPicker
                  ledger={ledger}
                  value={counterparty}
                  onChange={setCounterparty}
                  allowWorld
                  disabled={mutation.isPending}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCounterparty(true)}
                className="text-left text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {isTopUp ? "Money comes from outside Plut" : "Money goes outside Plut"} — change the
                other account
              </button>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isTopUp ? "Add money" : "Take money out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DirectionButton({
  active,
  onClick,
  icon,
  label,
  help,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  help: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground">{help}</span>
    </button>
  );
}

function mapAdjustError(code: string): string {
  switch (code) {
    case "Admin.ReasonRequired":
      return "A reason is required.";
    case "Admin.UnsupportedManualPostingType":
      return "That kind of adjustment isn't allowed from here.";
    case "Account.InvalidPath":
      return "One of the accounts isn't a valid account path.";
    case "Asset.Unknown":
      return "That asset isn't registered on this ledger.";
    case "Ledger.InvalidCombination":
      return "Unknown or inactive ledger.";
    case "Idempotency.KeyReuse":
      return "That request was already submitted with different details. Try again.";
    default:
      return code || "The adjustment failed.";
  }
}
