import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { freezeCryptoWallet, cryptoWalletKeys } from "@/api/crypto-wallets";
import type { AdminCryptoWalletDto } from "@/api/types/crypto-wallets.types";

const MAX = 500;

type Props = {
  userId: string;
  wallets: AdminCryptoWalletDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Per 02-WALLETS_AND_USERS.md §2's mockup: defaults to "all wallets" since a compliance freeze is
 * almost always "stop this person from moving anything," not "stop them trading BTC specifically."
 * There's no bulk/by-user freeze endpoint — "all wallets" loops POST .../freeze per wallet id. */
export function FreezeCryptoWalletDialog({ userId, wallets, open, onOpenChange }: Props) {
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
      // allowDeposits defaults to true server-side — no toggle in this dialog per the doc's
      // mockup; freeze always means "deposits remain allowed, withdrawals/trades blocked."
      await Promise.all(
        targets.map((w) => freezeCryptoWallet(w.id, { reason: reason.trim() })),
      );
    },
    onSuccess: () => {
      toast.success(
        scope === "all" ? "All wallets frozen." : `${scope} wallet frozen.`,
      );
      qc.invalidateQueries({ queryKey: cryptoWalletKeys.list({ userId }) });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Freeze failed."),
  });

  const trimmed = reason.trim();
  const targetCount = scope === "all" ? wallets.length : wallets.filter((w) => w.asset === scope).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Freeze Wallet(s)</DialogTitle>
          <DialogDescription>
            Deposits remain allowed; withdrawals and trades are blocked. Reversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Scope</label>
          <RadioGroup value={scope} onValueChange={setScope} className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="all" id="freeze-scope-all" />
              All wallets ({wallets.length})
            </label>
            {wallets.map((w) => (
              <label key={w.id} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={w.asset} id={`freeze-scope-${w.asset}`} />
                {w.asset} only
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="freeze-reason" className="text-sm font-medium">
            Reason <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="freeze-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX))}
            placeholder="e.g. Compliance hold pending review."
            rows={3}
            disabled={mutation.isPending}
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {reason.length} / {MAX}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || trimmed.length === 0 || targetCount === 0}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Freeze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
