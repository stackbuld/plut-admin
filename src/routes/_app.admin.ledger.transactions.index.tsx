import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { ledgerQueries } from "@/api/ledger";
import { ledgerTransactionQueries } from "@/api/ledger-transactions";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/04-TRANSACTIONS_EXPLORER.md — the daily investigation
// tool. Search-and-investigate, not a live tail — refreshed on demand.
export const Route = createFileRoute("/_app/admin/ledger/transactions/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(ledgerQueries.ledgers());
  },
  component: TransactionsListPage,
});

function TransactionsListPage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");
  const [account, setAccount] = useState("");
  const [userId, setUserId] = useState("");
  const [txType, setTxType] = useState("");
  const [filters, setFilters] = useState({ account: "", userId: "", txType: "" });

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const { data: rows, isLoading } = useQuery(
    ledgerTransactionQueries.list({
      ledger,
      account: filters.account || undefined,
      userId: filters.userId || undefined,
      txType: filters.txType || undefined,
      limit: 100,
    }),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Transactions Explorer</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Find a transaction by account, user, or type and see everything about it.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <Field label="Ledger">
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
        </Field>
        <Field label="Account">
          <Input value={account} onChange={(e) => setAccount(e.target.value)} className="font-mono text-sm" placeholder="assets:banks:paystack:ngn" />
        </Field>
        <Field label="User Id">
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} className="font-mono text-sm" placeholder="usr_..." />
        </Field>
        <Field label="Type">
          <Input value={txType} onChange={(e) => setTxType(e.target.value)} className="font-mono text-sm" placeholder="CryptoSellSettlement" />
        </Field>
        <Button onClick={() => setFilters({ account, userId, txType })}>
          <Search className="h-4 w-4" /> Search
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Reference", "Type", "Source", "Destination", "Amount", "When"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((row) => (
                  <tr key={`${row.txId}-${row.postingSeq}`} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/ledger/transactions/$reference"
                        params={{ reference: row.reference }}
                        search={{ ledger }}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-xs">{row.txType}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{row.sourceAccount}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{row.destinationAccount}</td>
                    <td className="px-6 py-3.5 font-mono">
                      {row.amountMinor.toLocaleString()} {row.assetCode}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{formatDateTime(row.committedAt)}</td>
                  </tr>
                ))}
                {(rows ?? []).length === 0 && <EmptyRow cols={6} />}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
