import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { liquidationKeys, reconcileLiquidationBatch } from "@/api/crypto-liquidation";
import type { LiquidationPoolRowDto } from "@/api/types/crypto-liquidation.types";

type Props = {
  poolRows: LiquidationPoolRowDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Records a completed OTC sale of pooled, earmarked crypto — see
 * docs/wallet-service-docs/crypto-wallet/admin-console/15-SELL_ORDERS_AND_LIQUIDATION.md §2 Part B.
 * `bankAccount` is a free-text field for now — no admin endpoint exists yet that lists the fiat
 * ledger's real bank-asset accounts for a dropdown, so this doesn't invent one; the value is
 * recorded as typed, for audit/reference, not validated against a known account list. */
export function ReconcileLiquidationDialog({ poolRows, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [asset, setAsset] = useState("");
  const [soldQuantity, setSoldQuantity] = useState("");
  const [fiatCurrency, setFiatCurrency] = useState("NGN");
  const [fiatProceeds, setFiatProceeds] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setAsset("");
    setSoldQuantity("");
    setFiatProceeds("");
    setBankAccount("");
    setNotes("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      reconcileLiquidationBatch({
        asset,
        soldQuantity: Number(soldQuantity),
        fiatCurrency,
        // Proceeds entered in major units (e.g. "37800000.00" NGN) — minor units for the wire, same
        // convention every other admin money-input on this frontend already uses.
        fiatProceedsMinor: Math.round(Number(fiatProceeds) * 100),
        bankAccount,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Liquidation batch recorded.");
      qc.invalidateQueries({ queryKey: liquidationKeys.all() });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(mapReconcileError(e.message)),
  });

  const selectedPool = poolRows.find((r) => r.asset === asset);
  const canSubmit =
    asset && Number(soldQuantity) > 0 && fiatCurrency && Number(fiatProceeds) > 0 && bankAccount.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!mutation.isPending) {
          onOpenChange(o);
          if (!o) reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record OTC Liquidation Batch</DialogTitle>
          <DialogDescription>
            Removes the sold quantity from the pending-liquidation pool. Does not yet clear the
            matching fiat receivable — see the pool screen's own note on this.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="liq-asset">Asset</Label>
            <select
              id="liq-asset"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select an asset…</option>
              {poolRows.map((r) => (
                <option key={r.asset} value={r.asset}>
                  {r.asset} — {r.pendingLiquidation} pending
                </option>
              ))}
            </select>
            {selectedPool && (
              <p className="text-[11px] text-muted-foreground">
                Pool balance: {selectedPool.pendingLiquidation} {selectedPool.asset}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="liq-sold">Quantity Sold</Label>
            <Input
              id="liq-sold"
              type="number"
              step="any"
              value={soldQuantity}
              onChange={(e) => setSoldQuantity(e.target.value)}
              placeholder="0.42"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="liq-currency">Fiat Currency</Label>
              <Input
                id="liq-currency"
                value={fiatCurrency}
                onChange={(e) => setFiatCurrency(e.target.value.toUpperCase())}
                placeholder="NGN"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="liq-proceeds">Proceeds</Label>
              <Input
                id="liq-proceeds"
                type="number"
                step="any"
                value={fiatProceeds}
                onChange={(e) => setFiatProceeds(e.target.value)}
                placeholder="37800000.00"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="liq-bank">Bank Account</Label>
            <Input
              id="liq-bank"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="GTBank — Plut Ops"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="liq-notes">Notes (optional)</Label>
            <Textarea
              id="liq-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="OTC batch via XYZ desk"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Reconcile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function mapReconcileError(code: string): string {
  switch (code) {
    case "CRYPTO_INSUFFICIENT_LIQUIDATION_POOL_BALANCE":
      return "Sold quantity exceeds the current pool balance for this asset.";
    case "CRYPTO_ASSET_NOT_SUPPORTED":
      return "This asset isn't configured on the ledger.";
    case "CRYPTO_INVALID_AMOUNT":
      return "Amount must be greater than zero.";
    default:
      return code || "Failed to record the batch.";
  }
}
