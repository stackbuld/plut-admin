import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { ledgerQueries } from "@/api/ledger";
import { floatKeys, floatQueries, setFloatThreshold } from "@/api/ledger-float";
import { cn } from "@/lib/utils";

// docs/ledger-service-docs/admin-console/03-FLOAT_AND_PREFUNDING.md — the screen the incident this
// whole admin console plan is named after proves was missing. Sorted Critical-first server-side.
export const Route = createFileRoute("/_app/admin/ledger/float")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(ledgerQueries.ledgers());
  },
  component: FloatPage,
});

function FloatPage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const { data: accounts, isLoading } = useQuery(floatQueries.accounts(ledger));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Float & Prefunding Monitoring</h1>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Every account here has an admin-set threshold — an account with no threshold simply
            doesn't appear, since "how much float is enough" is a business judgment, not something
            derived from ledger data.
          </p>
        </div>
        <select
          value={ledger}
          onChange={(e) => setLedger(e.target.value)}
          className="h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
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
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Account", "Balance", "Threshold", "Status", "Manifest", ""].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(accounts ?? []).map((row) => (
                  <tr
                    key={row.account}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-secondary/40",
                      row.status === "Critical" && "bg-destructive/5",
                    )}
                  >
                    <td className="px-6 py-3.5 font-mono text-xs">{row.account}</td>
                    <td className="px-6 py-3.5 font-mono">{row.balanceMinor.toLocaleString()}</td>
                    <td className="px-6 py-3.5 font-mono text-muted-foreground">
                      {row.thresholdMinor.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      {row.inManifest ? (
                        <span className="text-xs text-muted-foreground">Yes</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Missing
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setEditingAccount(row.account)}
                      >
                        <Pencil className="h-3 w-3" /> Threshold
                      </Button>
                    </td>
                  </tr>
                ))}
                {(accounts ?? []).length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingAccount && (
        <SetThresholdDialog
          ledger={ledger}
          account={editingAccount}
          currentThreshold={accounts?.find((a) => a.account === editingAccount)?.thresholdMinor ?? 0}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "Critical" | "Low" | "Healthy" }) {
  if (status === "Critical") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
        <AlertTriangle className="h-3 w-3" /> Critical
      </span>
    );
  }
  if (status === "Low") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" /> Low
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> Healthy
    </span>
  );
}

function SetThresholdDialog({
  ledger,
  account,
  currentThreshold,
  onClose,
}: {
  ledger: string;
  account: string;
  currentThreshold: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(String(currentThreshold));

  const mutation = useMutation({
    mutationFn: () => setFloatThreshold(ledger, account, Number(value)),
    onSuccess: () => {
      toast.success("Threshold updated.");
      qc.invalidateQueries({ queryKey: floatKeys.accounts(ledger) });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update threshold."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-lg">
        <h3 className="text-sm font-semibold">Set threshold</h3>
        <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{account}</p>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-4"
          placeholder="Threshold (minor units)"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
