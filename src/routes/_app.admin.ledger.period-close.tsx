import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format as formatDf, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { closePeriod, periodCloseQueries, periodCloseKeys } from "@/api/ledger-period-close";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/10-PERIOD_CLOSE.md — snapshot + record-keeping only.
// Deliberately does NOT lock or flag postings against a closed period — that's an open
// finance/product decision the doc leaves unresolved (§4), not something to guess at here.
export const Route = createFileRoute("/_app/admin/ledger/period-close")({
  component: PeriodClosePage,
});

function PeriodClosePage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");
  const [confirmPeriod, setConfirmPeriod] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const { data: periods, isLoading } = useQuery(periodCloseQueries.periods(ledger));

  const mutation = useMutation({
    mutationFn: (period: string) => closePeriod(ledger, period),
    onSuccess: (_result, period) => {
      toast.success(`${period} closed.`);
      qc.invalidateQueries({ queryKey: periodCloseKeys.periods(ledger) });
      setConfirmPeriod(null);
    },
    onError: (e: Error) => toast.error(mapCloseError(e.message)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Period Close</h1>
          <p className="max-w-xl text-xs text-muted-foreground">
            Snapshots the trial balance and records the period as closed. Does not lock or flag
            future postings against it — that decision needs finance/product input first.
          </p>
        </div>
        <select
          value={ledger}
          onChange={(e) => setLedger(e.target.value)}
          className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
        >
          {(ledgers ?? []).map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                {["Period", "Status", "Closed By", "Closed At", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(periods ?? []).map((row) => (
                <tr key={row.period} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-6 py-3.5 font-mono">{row.period}</td>
                  <td className="px-6 py-3.5">
                    {row.closed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Closed
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">Open</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">{row.closedByEmail ?? "—"}</td>
                  <td className="px-6 py-3.5 text-xs text-muted-foreground">
                    {row.closedAt ? formatDateTime(row.closedAt) : "—"}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {!row.closed && (
                      <Button size="sm" variant="outline" onClick={() => setConfirmPeriod(row.period)}>
                        Close {formatPeriodLabel(row.period)}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={confirmPeriod !== null} onOpenChange={(o) => !o && setConfirmPeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {confirmPeriod ? formatPeriodLabel(confirmPeriod) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Snapshots the current trial balance for <span className="font-mono">{ledger}</span> and
              records this period as closed. This does not block or flag any future posting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={() => confirmPeriod && mutation.mutate(confirmPeriod)}
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatPeriodLabel(period: string): string {
  try {
    return formatDf(parseISO(`${period}-01T00:00:00Z`), "MMMM yyyy");
  } catch {
    return period;
  }
}

function mapCloseError(code: string): string {
  switch (code) {
    case "Admin.PeriodAlreadyClosed":
      return "This period is already closed.";
    case "Admin.InvalidPeriod":
      return "Invalid period.";
    case "Ledger.InvalidCombination":
      return "Unknown or inactive ledger.";
    default:
      return code || "Failed to close the period.";
  }
}
