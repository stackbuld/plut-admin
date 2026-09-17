import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellOff,
  BellRing,
  CheckCircle2,
  HelpCircle,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TabLoader } from "@/components/plut/catalog-shared";
import { ledgerQueries } from "@/api/ledger";
import { floatKeys, floatQueries, setFloatThreshold } from "@/api/ledger-float";
import type {
  AccountKind,
  OperationalAccountDto,
  OperationalAccountStatus,
} from "@/api/types/ledger-float.types";
import type { AssetDto } from "@/api/types/ledger.types";
import { exceedsPrecision, formatMinor, precisionOf, toMinorString } from "@/lib/money";
import { cn } from "@/lib/utils";
import { LedgerPicker } from "@/components/plut/ledger/LedgerPicker";
import { AdjustBalanceDialog } from "@/components/plut/ledger/AdjustBalanceDialog";
import {
  KIND_HELP,
  KIND_LABEL,
  accountName,
  categoryLabel,
  riskNote,
} from "@/components/plut/ledger/account-labels";

/**
 * Operational Accounts — docs/ledger-service-docs/admin-console/03-FLOAT_AND_PREFUNDING.md, widened
 * from the threshold-only Float monitor it replaces.
 *
 * Three things changed, all aimed at someone who has to keep the platform running without an
 * accounting background:
 *
 *  1. Every operational account is listed, not just ones that already have a threshold. The old
 *     screen rendered empty on a fresh deployment and offered no way to add anything to it, so an
 *     account nobody had thought to monitor was invisible — the same blind spot as the incident this
 *     screen exists for, one level up.
 *  2. Balances are money ("₦452,300.00"), not raw minor units ("45230000"), using each asset's real
 *     precision. Misreading a balance by 100x on a triage screen is a genuine hazard.
 *  3. Topping up or drawing down an account is done here, in plain words, instead of hand-typing a
 *     source and destination path into the corrections form.
 */
export const Route = createFileRoute("/_app/admin/ledger/float")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(ledgerQueries.ledgers());
  },
  component: OperationalAccountsPage,
});

type Lens = "all" | "attention" | "canRunDry";

function OperationalAccountsPage() {
  const [ledger, setLedger] = useState("");
  const [search, setSearch] = useState("");
  const [lens, setLens] = useState<Lens>("all");
  const [adjusting, setAdjusting] = useState<OperationalAccountDto | null>(null);
  const [monitoring, setMonitoring] = useState<OperationalAccountDto | null>(null);

  const { data: accounts, isLoading } = useQuery(floatQueries.operational(ledger));
  // Only needed for the handful of multi-asset accounts, whose per-asset balances the row renders
  // itself rather than through the row's own single `precision`.
  const { data: assets } = useQuery(ledgerQueries.assets());

  const needsAttention = useMemo(
    () => (accounts ?? []).filter((a) => a.status === "Critical" || a.status === "Low"),
    [accounts],
  );

  const unwatched = useMemo(
    () => (accounts ?? []).filter((a) => a.canRunDry && !a.monitored),
    [accounts],
  );

  const visible = useMemo(() => {
    let rows = accounts ?? [];
    if (lens === "attention")
      rows = rows.filter((a) => a.status === "Critical" || a.status === "Low");
    if (lens === "canRunDry") rows = rows.filter((a) => a.canRunDry);

    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (a) =>
        a.account.toLowerCase().includes(q) ||
        accountName(a).toLowerCase().includes(q) ||
        (categoryLabel(a.category) ?? "").toLowerCase().includes(q),
    );
  }, [accounts, lens, search]);

  const grouped = useMemo(() => {
    const groups = new Map<AccountKind, OperationalAccountDto[]>();
    for (const row of visible) {
      const existing = groups.get(row.kind);
      if (existing) existing.push(row);
      else groups.set(row.kind, [row]);
    }
    return [...groups.entries()];
  }, [visible]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Operational Accounts</h1>
            <p className="max-w-2xl text-xs text-muted-foreground">
              The accounts Plut itself runs on, and what each one is holding right now. Accounts
              money is paid <em>out of</em> can run empty — when one does, real user transactions
              start failing, so those are the ones worth watching.
            </p>
          </div>
          <LedgerPicker value={ledger} onChange={setLedger} />
        </div>

        {needsAttention.length > 0 && (
          <button
            type="button"
            onClick={() => setLens("attention")}
            className="flex w-full items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-left text-sm"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              <strong>
                {needsAttention.length} account{needsAttention.length === 1 ? "" : "s"} need
                {needsAttention.length === 1 ? "s" : ""} topping up.
              </strong>{" "}
              <span className="text-muted-foreground">
                Leaving these empty will start failing user transactions.
              </span>
            </span>
          </button>
        )}

        {unwatched.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
            <BellOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {unwatched.length} account{unwatched.length === 1 ? "" : "s"} that can run empty{" "}
              {unwatched.length === 1 ? "has" : "have"} no low-balance alert.{" "}
              <span className="text-muted-foreground">
                Set one and you'll be told before it runs out instead of afterwards.
              </span>
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, purpose or account path…"
              className="pl-8"
            />
          </div>
          <LensButton active={lens === "all"} onClick={() => setLens("all")}>
            All accounts
          </LensButton>
          <LensButton active={lens === "attention"} onClick={() => setLens("attention")}>
            Needs attention
          </LensButton>
          <LensButton active={lens === "canRunDry"} onClick={() => setLens("canRunDry")}>
            Can run empty
          </LensButton>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border bg-card">
            <TabLoader />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card py-16 text-center">
            <Wallet className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">No accounts match.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {search
                ? "Try a different word, or clear the search."
                : "This ledger has no declared operational accounts yet."}
            </p>
          </div>
        ) : (
          grouped.map(([kind, rows]) => (
            <section key={kind} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold">{KIND_LABEL[kind]}</h2>
                {KIND_HELP[kind] && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{KIND_HELP[kind]}</TooltipContent>
                  </Tooltip>
                )}
                <span className="text-xs text-muted-foreground">({rows.length})</span>
              </div>

              <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-secondary/60">
                      <tr className="text-left">
                        {["Account", "Holding", "Alert below", "Status", ""].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <AccountRow
                          key={row.account}
                          row={row}
                          assets={assets}
                          onAdjust={() => setAdjusting(row)}
                          onMonitor={() => setMonitoring(row)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))
        )}

        <AdjustBalanceDialog
          ledger={ledger}
          account={adjusting}
          open={Boolean(adjusting)}
          onOpenChange={(open) => !open && setAdjusting(null)}
        />
        <SetAlertDialog
          ledger={ledger}
          account={monitoring}
          open={Boolean(monitoring)}
          onOpenChange={(open) => !open && setMonitoring(null)}
        />
      </div>
    </TooltipProvider>
  );
}

function AccountRow({
  row,
  assets,
  onAdjust,
  onMonitor,
}: {
  row: OperationalAccountDto;
  assets: AssetDto[] | undefined;
  onAdjust: () => void;
  onMonitor: () => void;
}) {
  const multiAsset = row.assetCode === null;
  const balanceEntries = Object.entries(row.balances);

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-secondary/40",
        row.status === "Critical" && "bg-destructive/5",
      )}
    >
      <td className="px-5 py-3">
        <div className="flex items-start gap-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{accountName(row)}</span>
              {!row.inManifest && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-2.5 w-2.5" /> Undeclared
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    This account is being used but isn't declared in the ledger's account file.
                    That's exactly the gap behind the unfunded-float incident — worth adding.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="font-mono text-[10px] break-all text-muted-foreground">
              {row.account}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{riskNote(row)}</div>
          </div>
        </div>
      </td>

      <td className="px-5 py-3 font-mono whitespace-nowrap">
        {multiAsset ? (
          balanceEntries.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            balanceEntries.map(([asset, minor]) => (
              <div key={asset} className="text-xs">
                {formatMinor(minor, asset, precisionOf(asset, assets))}
              </div>
            ))
          )
        ) : (
          formatMinor(row.balanceMinor, row.assetCode, row.precision)
        )}
      </td>

      <td className="px-5 py-3 font-mono whitespace-nowrap text-muted-foreground">
        {row.monitored ? formatMinor(row.thresholdMinor, row.assetCode, row.precision) : "—"}
      </td>

      <td className="px-5 py-3">
        <StatusPill status={row.status} canRunDry={row.canRunDry} />
      </td>

      <td className="px-5 py-3">
        <div className="flex justify-end gap-1">
          {row.canRunDry && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onMonitor}>
              {row.monitored ? <BellRing className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
              {row.monitored ? "Alert" : "Set alert"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onAdjust}>
            <SlidersHorizontal className="h-3 w-3" /> Adjust
          </Button>
        </div>
      </td>
    </tr>
  );
}

function StatusPill({
  status,
  canRunDry,
}: {
  status: OperationalAccountStatus;
  canRunDry: boolean;
}) {
  const pill = (className: string, icon: React.ReactNode, label: string, help: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            className,
          )}
        >
          {icon}
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{help}</TooltipContent>
    </Tooltip>
  );

  switch (status) {
    case "Critical":
      return pill(
        "bg-destructive/15 text-destructive",
        <AlertTriangle className="h-3 w-3" />,
        "Empty",
        "This account has nothing in it. Anything that needs to pay out of it will fail until it's topped up.",
      );
    case "Low":
      return pill(
        "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        <AlertTriangle className="h-3 w-3" />,
        "Running low",
        "Below the level you asked to be warned at. Top it up before it empties.",
      );
    case "Healthy":
      return pill(
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        <CheckCircle2 className="h-3 w-3" />,
        "Healthy",
        "Comfortably above the level you asked to be warned at.",
      );
    case "NotMonitored":
      return pill(
        "bg-secondary text-muted-foreground",
        <BellOff className="h-3 w-3" />,
        "No alert set",
        canRunDry
          ? "Nobody will be warned if this account runs low. Set an alert to change that."
          : "No alert needed — this account only ever receives money.",
      );
    default:
      return pill(
        "bg-secondary text-muted-foreground",
        <HelpCircle className="h-3 w-3" />,
        "Multi-asset",
        "This account holds several assets at once, so a single low-balance level doesn't apply to it.",
      );
  }
}

function LensButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {children}
    </Button>
  );
}

/**
 * Sets the balance an account is allowed to fall to before it's flagged here and alerted on via
 * FloatThresholdCheckJobService. Entered in real money — the old dialog asked for minor units.
 */
function SetAlertDialog({
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
  const precision = account?.precision ?? 2;
  const [value, setValue] = useState("");

  // Re-seed from the account each time the dialog is opened for a different row.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (account && seededFor !== account.account) {
    setSeededFor(account.account);
    // Show the stored threshold back in major units without float division.
    setValue(account.monitored ? majorFromMinor(account.thresholdMinor, precision) : "");
  }

  const thresholdMinor = toMinorString(value, precision);
  const amountIsValid = thresholdMinor !== null;
  const tooPrecise = exceedsPrecision(value, precision);

  const mutation = useMutation({
    // This endpoint types the threshold as a 64-bit integer rather than BigInteger, so it goes on
    // the wire as a number — but it is computed exactly first, not by float multiplication.
    mutationFn: () => setFloatThreshold(ledger, account!.account, Number(thresholdMinor)),
    onSuccess: () => {
      toast.success("Alert level saved.");
      qc.invalidateQueries({ queryKey: floatKeys.all() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't save the alert level."),
  });

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Warn me when this runs low</DialogTitle>
          <DialogDescription>
            {accountName(account)} · holds{" "}
            {formatMinor(account.balanceMinor, account.assetCode, precision)} right now
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="alert-level">Warn me below ({account.assetCode ?? "amount"})</Label>
          <Input
            id="alert-level"
            type="number"
            step="any"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="5000000.00"
            disabled={mutation.isPending}
          />
          {tooPrecise && (
            <p className="text-[11px] text-destructive">
              {account.assetCode} supports at most {precision} decimal place
              {precision === 1 ? "" : "s"}.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Pick roughly what normally flows through this account in a day or two. There's no right
            answer the system can work out for you — it depends on your expected volume.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!amountIsValid || tooPrecise || mutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Minor units back to a major-unit input string, without float division. */
function majorFromMinor(minor: number, precision: number): string {
  if (precision === 0) return String(minor);
  const digits = Math.trunc(Math.abs(minor))
    .toString()
    .padStart(precision + 1, "0");
  const whole = digits.slice(0, digits.length - precision);
  const fraction = digits.slice(digits.length - precision).replace(/0+$/, "");
  return `${minor < 0 ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
