import { useState } from "react";
import { Loader2, Unlock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { unfreezeCryptoWallet, cryptoWalletKeys } from "@/api/crypto-wallets";

/** Per-wallet unfreeze — not in the doc's mockup (which only shows top-level Freeze/Suspend
 * buttons), but Freeze's own copy says "Reversible," and POST .../unfreeze exists specifically to
 * reverse it, so a Frozen wallet row needs a way back without going through support tooling
 * outside the admin console. Row-scoped (not "unfreeze all") since freezing is already
 * per-wallet-id under the hood and a mixed frozen/active set is a normal state to be in. */
export function UnfreezeCryptoWalletAction({ userId, walletId }: { userId: string; walletId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Unlock className="h-3.5 w-3.5" /> Unfreeze
      </Button>
      <UnfreezeDialog userId={userId} walletId={walletId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function UnfreezeDialog({
  userId,
  walletId,
  open,
  onOpenChange,
}: {
  userId: string;
  walletId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => unfreezeCryptoWallet(walletId),
    onSuccess: () => {
      toast.success("Wallet unfrozen.");
      qc.invalidateQueries({ queryKey: cryptoWalletKeys.list({ userId }) });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Unfreeze failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Unfreeze Wallet</DialogTitle>
          <DialogDescription>
            Restores normal withdrawal/trade access for this wallet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Unfreeze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
