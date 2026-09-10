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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { suspendCryptoWallet, cryptoWalletKeys } from "@/api/crypto-wallets";
import type { AdminCryptoWalletDto } from "@/api/types/crypto-wallets.types";

const MAX = 500;

type Props = {
  userId: string;
  wallets: AdminCryptoWalletDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Same shape as Freeze (default "all wallets", scope to one asset) but no "allow deposits" nuance
 * — Suspended blocks everything, including deposits, by definition. Used for fraud/KYC failure,
 * not a routine compliance hold, per 02-WALLETS_AND_USERS.md §2. No bulk/by-user suspend endpoint
 * either — "all wallets" loops POST .../suspend per wallet id. */
export function SuspendCryptoWalletDialog({ userId, wallets, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [scope, setScope] = useState<string>("all");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setScope("all");
      setReason("");
    }
  }, [open, userId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const targets = scope === "all" ? wallets : wallets.filter((w) => w.asset === scope);
      await Promise.all(
        targets.map((w) => suspendCryptoWallet(w.id, { reason: reason.trim() })),
      );
    },
    onSuccess: () => {
      toast.success(scope === "all" ? "All wallets suspended." : `${scope} wallet suspended.`);
      qc.invalidateQueries({ queryKey: cryptoWalletKeys.list({ userId }) });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Suspend failed."),
  });

  const trimmed = reason.trim();
  const targetCount = scope === "all" ? wallets.length : wallets.filter((w) => w.asset === scope).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend Wallet(s)</DialogTitle>
          <DialogDescription>
            All operations blocked, including deposits — used for fraud/KYC failure, not a routine
            compliance hold.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Scope</label>
          <RadioGroup value={scope} onValueChange={setScope} className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="all" id="suspend-scope-all" />
              All wallets ({wallets.length})
            </label>
            {wallets.map((w) => (
              <label key={w.id} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={w.asset} id={`suspend-scope-${w.asset}`} />
                {w.asset} only
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="suspend-reason" className="text-sm font-medium">
            Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX))}
            placeholder="e.g. Suspected fraud — pending investigation."
            rows={3}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {reason.length} / {MAX}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>This blocks deposits too — more severe than Freeze. Confirm this is fraud/KYC-driven, not a routine hold.</span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || trimmed.length === 0 || targetCount === 0}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Suspend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
