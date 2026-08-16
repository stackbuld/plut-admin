import { useState } from "react";
import { Loader2, RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { FilterSelect } from "@/components/plut/catalog-shared";
import {
  forceRefundVasTransaction,
  retryVasTransaction,
  switchVasTransactionProvider,
  vasKeys,
  vasQueries,
} from "@/api/vas";
import type { VasAdminTransactionDetail } from "@/api/types/vas.types";
import { formatVasAmount } from "./VasStatusBadges";

/**
 * Actions are only ever shown when the transaction's status makes them valid — retry/switch on
 * Failed or PendingProvider, force-refund only on Failed (VAS admin design 02b).
 */
export function VasTransactionActions({ transaction }: { transaction: VasAdminTransactionDetail }) {
  const [retryOpen, setRetryOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const canRetry = transaction.status === "Failed";
  const canSwitch = transaction.status === "Failed" || transaction.status === "PendingProvider";
  const canForceRefund = transaction.status === "Failed" && !transaction.refundedAt;

  if (!canRetry && !canSwitch && !canForceRefund) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {canRetry && (
          <Button size="sm" variant="outline" onClick={() => setRetryOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        )}
        {canSwitch && (
          <Button size="sm" variant="outline" onClick={() => setSwitchOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> Switch Provider
          </Button>
        )}
        {canForceRefund && (
          <Button size="sm" variant="destructive" onClick={() => setRefundOpen(true)}>
            <Undo2 className="h-3.5 w-3.5" /> Force Refund
          </Button>
        )}
      </div>

      <RetryDialog transaction={transaction} open={retryOpen} onOpenChange={setRetryOpen} />
      <SwitchProviderDialog
        transaction={transaction}
        open={switchOpen}
        onOpenChange={setSwitchOpen}
      />
      <ForceRefundDialog transaction={transaction} open={refundOpen} onOpenChange={setRefundOpen} />
    </>
  );
}

function useInvalidateAfterAction(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: vasKeys.transactionDetail(id) });
    qc.invalidateQueries({ queryKey: vasKeys.transactions() });
  };
}

function RetryDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: VasAdminTransactionDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const invalidate = useInvalidateAfterAction(transaction.id);
  const mutation = useMutation({
    mutationFn: () => retryVasTransaction(transaction.id),
    onSuccess: () => {
      toast.success("Transaction queued for retry.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Retry failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retry Transaction</DialogTitle>
          <DialogDescription>
            Re-attempts the purchase against a provider for {transaction.transactionReference}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SwitchProviderDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: VasAdminTransactionDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const invalidate = useInvalidateAfterAction(transaction.id);
  const { data: providers } = useQuery({ ...vasQueries.providerList(), enabled: open });
  const [providerId, setProviderId] = useState("");

  const options = (providers ?? [])
    .filter((p) => p.id !== transaction.providerId)
    .map((p) => ({ v: p.id, l: `${p.name} (${p.code})` }));

  const mutation = useMutation({
    mutationFn: () => switchVasTransactionProvider(transaction.id, { newProviderId: providerId }),
    onSuccess: () => {
      toast.success("Provider switched.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Switch provider failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Provider</DialogTitle>
          <DialogDescription>
            Currently on{" "}
            {transaction.providerName ?? transaction.providerCode ?? "unknown provider"}. Pick a
            different provider to retry this transaction against.
          </DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other providers are available.</p>
        ) : (
          <FilterSelect
            value={providerId}
            onChange={setProviderId}
            placeholder="Select provider"
            options={options}
          />
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !providerId}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Switch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ForceRefundDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: VasAdminTransactionDetail;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const invalidate = useInvalidateAfterAction(transaction.id);
  const mutation = useMutation({
    mutationFn: () => forceRefundVasTransaction(transaction.id),
    onSuccess: () => {
      toast.success("Wallet refunded.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Force refund failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Force Refund</DialogTitle>
          <DialogDescription>
            This moves real money — refunds the held wallet debit back to the user immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
          <p className="font-semibold text-destructive">
            {formatVasAmount(transaction.amount, transaction.currencyCode)} will be refunded
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{transaction.transactionReference}</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
