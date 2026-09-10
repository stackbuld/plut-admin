import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ledgerQueries } from "@/api/ledger";
import { revertLedgerTransaction } from "@/api/ledger-corrections";

// docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md §2 "Revert a
// transaction". Reachable pre-filled from the Transactions Explorer detail page via
// ?ledger=&reference=, or filled in by hand.
export const Route = createFileRoute("/_app/admin/ledger/corrections/revert")({
  validateSearch: (search: Record<string, unknown>) => ({
    ledger: search.ledger ? String(search.ledger) : "",
    reference: search.reference ? String(search.reference) : "",
  }),
  component: RevertPage,
});

function RevertPage() {
  const searchParams = Route.useSearch();
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());

  const [ledger, setLedger] = useState(searchParams.ledger);
  const [reference, setReference] = useState(searchParams.reference);
  const [reason, setReason] = useState("");
  const [force, setForce] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => revertLedgerTransaction(ledger, reference, reason, force),
    onSuccess: (result) => {
      toast.success(`Reverted. Reversal tx: ${result.reversalTxId}`);
      setReference("");
      setReason("");
      setForce(false);
    },
    onError: (e: Error) => toast.error(mapRevertError(e.message)),
  });

  const canSubmit = Boolean(ledger && reference.trim() && reason.trim()) && !mutation.isPending;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          This posts the exact inverse of the original transaction's legs. It does not delete
          history.
        </p>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="revert-ledger">Ledger</Label>
            <select
              id="revert-ledger"
              value={ledger}
              onChange={(e) => setLedger(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a ledger…</option>
              {(ledgers ?? []).map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="revert-reference">Transaction reference</Label>
            <Input
              id="revert-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="font-mono text-sm"
              placeholder="crypto-sell-9f2a..."
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="revert-reason">Reason (required)</Label>
            <Textarea
              id="revert-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Duplicate settlement, confirmed by user"
              rows={2}
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={force} onCheckedChange={(v) => setForce(v === true)} className="mt-0.5" />
            <span>
              <span className="font-medium">Force</span> — bypass safety checks (already-reverted
              guard). Only use this if you're intentionally re-reverting or overriding a known
              safety check.
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Revert
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert {reference}?</AlertDialogTitle>
            <AlertDialogDescription>
              This posts an inverse transaction on <span className="font-mono">{ledger}</span>{" "}
              right now.
              {force && (
                <span className="mt-2 block font-medium text-destructive">
                  Force is enabled — safety checks (e.g. already-reverted) will be bypassed.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                mutation.mutate();
              }}
            >
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function mapRevertError(code: string): string {
  switch (code) {
    case "Transaction.NotFound":
      return "No transaction found with that reference on this ledger.";
    case "Transaction.AlreadyReverted":
      return "Already reverted — check Force if you intentionally want to re-revert.";
    case "Transaction.RevenueRecognitionViolation":
      return "This is a settlement that recognized revenue — use a REVENUE_REVERSAL posting instead of a plain revert.";
    case "Admin.ReasonRequired":
      return "A reason is required.";
    default:
      return code || "Failed to revert the transaction.";
  }
}
