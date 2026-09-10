import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, SearchX } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { matchUnmatchedCryptoDepositToUser, cryptoDepositKeys } from "@/api/crypto-deposits";
import type { UnmatchedCryptoDepositDto } from "@/api/types/crypto-deposits.types";
import { userQueries } from "@/api";
import { formatCrypto } from "./CryptoWithdrawalStatusBadge";

type Props = {
  deposit: UnmatchedCryptoDepositDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * "This is the single most consequential manual action in the entire console" (03-DEPOSITS.md
 * §2) — crediting the wrong user here cannot be automatically undone, unlike a withdrawal
 * rejection (funds just return to where they came from) or a fee change (only affects the
 * future). Two independent safeguards on top of the doc's plain userId input, deliberately making
 * this harder to fat-finger than any other action dialog in the console:
 *   1. A live lookup of the typed userId (reusing the same admin user-detail fetcher the rest of
 *      the console uses to resolve a userId to a name) so the admin sees who they're about to
 *      credit before submitting, not just the raw id they typed.
 *   2. A required attestation checkbox — submit stays disabled until it's checked.
 */
export function MatchDepositToUserDialog({ deposit, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (open) {
      setUserId("");
      setVerified(false);
    }
  }, [open, deposit?.id]);

  const trimmedUserId = userId.trim();
  const lookupEnabled = open && trimmedUserId.length > 0;
  const {
    data: foundUser,
    isFetching: isLookingUp,
    isError: lookupFailed,
  } = useQuery({
    ...userQueries.detail(trimmedUserId),
    enabled: lookupEnabled,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () =>
      matchUnmatchedCryptoDepositToUser(deposit!.id, { userId: trimmedUserId }),
    onSuccess: () => {
      toast.success(
        `Matched to ${foundUser?.displayName ?? trimmedUserId} — deposit credited and marked resolved.`,
      );
      // Result DTO shape isn't pinned down by the doc — re-fetch both list views rather than
      // trying to patch the row from the mutation response.
      qc.invalidateQueries({ queryKey: cryptoDepositKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapMatchError(e.message)),
  });

  if (!deposit) return null;

  const canSubmit =
    trimmedUserId.length > 0 && !!foundUser && !lookupFailed && verified && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Match Deposit to User</DialogTitle>
          <DialogDescription>
            {formatCrypto(deposit.amount, deposit.asset)} on {deposit.network}, seen on{" "}
            <span className="font-mono">{deposit.exchangeSubAccountId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            This sub-account ID doesn't match any known Plut user. Investigate on Binance directly
            before crediting — this cannot be automatically undone if you match the wrong user.
          </span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="match-user-id">User ID</Label>
          <Input
            id="match-user-id"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setVerified(false);
            }}
            placeholder="Paste the Plut user ID you found on Binance"
            disabled={mutation.isPending}
            autoComplete="off"
            spellCheck={false}
          />

          {lookupEnabled && (
            <div className="rounded-lg border bg-secondary/40 px-3 py-2 text-xs">
              {isLookingUp ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Looking up user…
                </span>
              ) : foundUser ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  {foundUser.displayName} · {foundUser.email}
                </span>
              ) : lookupFailed ? (
                <span className="flex items-center gap-1.5 text-destructive">
                  <SearchX className="h-3.5 w-3.5 shrink-0" />
                  No user found with this ID — double-check before proceeding.
                </span>
              ) : null}
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Checkbox
            checked={verified}
            onCheckedChange={(c) => setVerified(c === true)}
            disabled={mutation.isPending || !foundUser}
            className="mt-0.5"
          />
          <span>
            I have independently verified on Binance that this deposit belongs to{" "}
            <strong>{foundUser?.displayName ?? "this user"}</strong>, and I understand crediting
            the wrong user cannot be automatically undone.
          </span>
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Match &amp; Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapMatchError(code: string): string {
  switch (code) {
    case "UNMATCHED_DEPOSIT_NOT_FOUND":
      return "Deposit not found. It may have been removed.";
    case "UNMATCHED_DEPOSIT_ALREADY_RESOLVED":
      return "This deposit was already resolved. Refresh the list.";
    default:
      return code || "Matching failed.";
  }
}
