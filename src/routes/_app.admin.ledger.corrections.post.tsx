import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { postManualTransfer } from "@/api/ledger-corrections";
import { MANUAL_POSTING_TYPES, type ManualPostingType } from "@/api/types/ledger-corrections.types";

const TYPE_LABELS: Record<ManualPostingType, string> = {
  ProviderFloatSeed: "Float Seed",
  Correction: "Correction",
  InitialFunding: "Initial Fund",
};

// docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md §2 "Manual posting
// (float seed / correction)". Restricted server-side to the three admin-safe tx types — this form
// mirrors that restriction, it doesn't add a new one.
export const Route = createFileRoute("/_app/admin/ledger/corrections/post")({
  component: PostPage,
});

function PostPage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());

  const [ledger, setLedger] = useState("");
  const [type, setType] = useState<ManualPostingType>("ProviderFloatSeed");
  const [source, setSource] = useState("world");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("NGN");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reset = () => {
    setDestination("");
    setAmount("");
    setReason("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      postManualTransfer({
        ledger,
        type,
        source,
        destination,
        // Amount entered in major units (e.g. "5000000.00") — minor units on the wire, the same
        // convention every other admin money-input on this frontend uses.
        amountMinor: Math.round(Number(amount) * 100),
        asset,
        reason,
      }),
    onSuccess: (result) => {
      toast.success(`Posted. Ledger tx: ${result.ledgerTxId}`);
      reset();
    },
    onError: (e: Error) => toast.error(mapPostError(e.message)),
  });

  const canSubmit =
    Boolean(ledger && source.trim() && destination.trim() && Number(amount) > 0 && asset.trim() && reason.trim()) &&
    !mutation.isPending;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Type maps directly to the existing tx_type values PROVIDER_FLOAT_SEED / CORRECTION /
          INITIAL_FUNDING — no other transaction type can be posted here.
        </p>

        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="post-ledger">Ledger</Label>
              <select
                id="post-ledger"
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
              <Label htmlFor="post-type">Type</Label>
              <select
                id="post-type"
                value={type}
                onChange={(e) => setType(e.target.value as ManualPostingType)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {MANUAL_POSTING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="post-source">Source</Label>
            <Input
              id="post-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="font-mono text-sm"
              placeholder="world"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="post-destination">Destination</Label>
            <Input
              id="post-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="font-mono text-sm"
              placeholder="assets:banks:exchange:ngn"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="post-amount">Amount</Label>
              <Input
                id="post-amount"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000000.00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="post-asset">Asset</Label>
              <Input
                id="post-asset"
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                placeholder="NGN"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="post-reason">Reason (required)</Label>
            <Textarea
              id="post-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Quarterly float top-up for exchange provider"
              rows={2}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Post
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post {TYPE_LABELS[type]} on {ledger}?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{source}</span> → <span className="font-mono">{destination}</span>
              <br />
              {amount} {asset}
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
              Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function mapPostError(code: string): string {
  switch (code) {
    case "Admin.UnsupportedManualPostingType":
      return "That transaction type isn't allowed from this form.";
    case "Admin.ReasonRequired":
      return "A reason is required.";
    case "Account.InvalidPath":
      return "Source or destination account path is invalid.";
    case "Asset.Unknown":
      return "Unknown asset code for this ledger.";
    case "Ledger.InvalidCombination":
      return "Unknown or inactive ledger.";
    default:
      return code || "Failed to post the transfer.";
  }
}
