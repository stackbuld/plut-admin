import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { floatQueries } from "@/api/ledger-float";
import { postManualTransfer } from "@/api/ledger-corrections";
import { MANUAL_POSTING_TYPES, type ManualPostingType } from "@/api/types/ledger-corrections.types";
import { exceedsPrecision, formatMinor, precisionOf, toMinorString } from "@/lib/money";
import { LedgerPicker } from "@/components/plut/ledger/LedgerPicker";
import { AccountPicker } from "@/components/plut/ledger/AccountPicker";
import { accountName } from "@/components/plut/ledger/account-labels";

/**
 * docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md §2 — the general
 * "move money between any two accounts" form. Still restricted server-side to the three admin-safe
 * transaction types; this form mirrors that restriction, it doesn't add a new one.
 *
 * Two changes over the original:
 *  - Source and destination are picked from accounts that actually exist, not typed by hand. A
 *    mistyped path either fails validation or, worse, posts real money into an account nobody is
 *    watching — which is how the incident behind this whole console began.
 *  - The amount is converted with the selected asset's real precision. It was hardcoded to `* 100`
 *    while this form's own ledger picker offers plut-crypto-global, where BTC is 8 decimals: typing
 *    "1 BTC" posted 100 satoshi.
 */
const TYPE_LABELS: Record<ManualPostingType, { label: string; help: string }> = {
  ProviderFloatSeed: {
    label: "Fund an account",
    help: "Put money into one of Plut's own accounts — a bank float, a provider balance.",
  },
  Correction: {
    label: "Fix a mistake",
    help: "Move money to correct something that was posted wrongly.",
  },
  InitialFunding: {
    label: "Open a new account",
    help: "Put the first money into an account that has never held any.",
  },
};

export const Route = createFileRoute("/_app/admin/ledger/corrections/post")({
  component: PostPage,
});

function PostPage() {
  const [ledger, setLedger] = useState("");
  const [type, setType] = useState<ManualPostingType>("ProviderFloatSeed");
  const [source, setSource] = useState("world");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: assets } = useQuery(ledgerQueries.assets());
  const { data: operational } = useQuery(floatQueries.operational(ledger));

  const accountByPath = useMemo(
    () => new Map((operational ?? []).map((a) => [a.account, a])),
    [operational],
  );

  // Default the asset to whatever the chosen accounts actually hold, so it's one less thing to get
  // wrong — still overridable for the multi-asset accounts where it's genuinely ambiguous.
  const impliedAsset =
    accountByPath.get(destination)?.assetCode ?? accountByPath.get(source)?.assetCode ?? null;
  const effectiveAsset = asset || impliedAsset || "";
  const precision = precisionOf(effectiveAsset, assets);

  // Exact string arithmetic — `amount * 10 ** precision` is already inexact for an 18-decimal
  // asset, and this form's own ledger picker offers plut-crypto-global.
  const amountMinor = toMinorString(amount, precision);
  const amountIsValid = amountMinor !== null && amountMinor !== "0";
  const tooPrecise = exceedsPrecision(amount, precision);

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
        amountMinor: amountMinor!,
        asset: effectiveAsset,
        reason: reason.trim(),
      }),
    onSuccess: (result) => {
      toast.success(`Posted. Ledger tx: ${result.ledgerTxId}`);
      reset();
    },
    onError: (e: Error) => toast.error(mapPostError(e.message)),
  });

  const canSubmit =
    Boolean(ledger && source && destination && effectiveAsset && reason.trim()) &&
    source !== destination &&
    amountIsValid &&
    !tooPrecise &&
    !mutation.isPending;

  const label = (path: string) => {
    if (path === "world") return "Outside Plut";
    const known = accountByPath.get(path);
    return known ? accountName(known) : path;
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Move money between two accounts. Every posting here is recorded permanently against your
          name with the reason you give.
        </p>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label>Ledger</Label>
            <LedgerPicker value={ledger} onChange={setLedger} className="h-9 w-full" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="post-type">What are you doing?</Label>
            <Select value={type} onValueChange={(v) => setType(v as ManualPostingType)}>
              <SelectTrigger id="post-type" className="h-auto py-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_POSTING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex flex-col items-start">
                      <span>{TYPE_LABELS[t].label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {TYPE_LABELS[t].help}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Money comes from</Label>
            <AccountPicker
              ledger={ledger}
              value={source}
              onChange={setSource}
              allowWorld
              placeholder="Choose where the money comes from…"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Money goes to</Label>
            <AccountPicker
              ledger={ledger}
              value={destination}
              onChange={setDestination}
              allowWorld
              placeholder="Choose where the money goes…"
            />
            {source && destination && source === destination && (
              <p className="text-[11px] text-destructive">
                Pick two different accounts — money has to move somewhere.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="post-amount">Amount</Label>
              <Input
                id="post-amount"
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000000.00"
              />
              {tooPrecise && (
                <p className="text-[11px] text-destructive">
                  {effectiveAsset} supports at most {precision} decimal place
                  {precision === 1 ? "" : "s"}.
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="post-asset">Currency / asset</Label>
              <Select value={effectiveAsset} onValueChange={setAsset}>
                <SelectTrigger id="post-asset" className="h-9">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {(assets ?? []).map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {impliedAsset && !asset && (
                <p className="text-[11px] text-muted-foreground">
                  Picked from the account you chose.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="post-reason">Why are you doing this?</Label>
            <Textarea
              id="post-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Quarterly float top-up for the Paystack account"
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">Required, and permanently recorded.</p>
          </div>

          {amountIsValid && source && destination && effectiveAsset && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>{formatMinor(amountMinor ?? "0", effectiveAsset, precision)}</strong> moves
                from <strong>{label(source)}</strong> to <strong>{label(destination)}</strong>.
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Review and post
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post this transfer?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="text-base font-semibold text-foreground">
                  {formatMinor(amountMinor ?? "0", effectiveAsset, precision)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>{label(source)}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  <span>{label(destination)}</span>
                </div>
                <div className="font-mono text-[10px] break-all">
                  {source} → {destination}
                </div>
              </div>
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
              Post it
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
    case "Idempotency.KeyReuse":
      return "That request was already submitted with different details. Try again.";
    default:
      return code || "Failed to post the transfer.";
  }
}
