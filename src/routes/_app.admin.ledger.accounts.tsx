import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { ledgerQueries } from "@/api/ledger";
import type { AccountRowDto } from "@/api/types/ledger.types";

// docs/ledger-service-docs/admin-console/02-LEDGERS_AND_ACCOUNTS.md — ledger-service's first-ever
// admin screen, and the foundational one everything else in this console depends on
// (Float & Prefunding, Trial Balance both need the same ListAccountsAsync primitive this screen
// introduces). Prefix search is the primary interaction, not a browse-everything list — a ledger
// can have thousands of per-user liability accounts, so this defaults to an empty result set until
// a prefix is entered, per the doc's own §2 note.
const QUICK_PREFIXES: { label: string; prefix: string }[] = [
  { label: "Bank Floats", prefix: "assets:banks" },
  { label: "Receivables", prefix: "assets:receivable" },
  { label: "Payables", prefix: "liabilities:payable" },
  { label: "Holds", prefix: "liabilities:hold" },
  { label: "Revenue", prefix: "revenue" },
  { label: "Expenses", prefix: "expenses" },
];

export const Route = createFileRoute("/_app/admin/ledger/accounts")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(ledgerQueries.ledgers());
  },
  component: LedgerAccountsPage,
});

function LedgerAccountsPage() {
  const { data: ledgers, isLoading: ledgersLoading } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");
  const [prefixInput, setPrefixInput] = useState("");
  const [activePrefix, setActivePrefix] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]); // history for "back"
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const { data: page, isLoading: accountsLoading, isFetching } = useQuery(
    ledgerQueries.accounts({ ledger, prefix: activePrefix, cursor, pageSize: 50 }),
  );

  const runSearch = (prefix: string) => {
    setActivePrefix(prefix);
    setPrefixInput(prefix);
    setCursor(undefined);
    setCursorStack([]);
  };

  const changeLedger = (name: string) => {
    setLedger(name);
    runSearch("");
  };

  const goNext = () => {
    if (!page?.nextCursor) return;
    setCursorStack((s) => [...s, cursor ?? ""]);
    setCursor(page.nextCursor);
  };

  const goBack = () => {
    setCursorStack((s) => {
      const next = [...s];
      const prev = next.pop();
      setCursor(prev ? prev : undefined);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Ledgers & Accounts</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Browse and search accounts within a ledger by address prefix. There's no useful
          "everything" view once a ledger has thousands of per-user accounts — start with a prefix
          below.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <div className="grid gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ledger
          </label>
          <select
            value={ledger}
            onChange={(e) => changeLedger(e.target.value)}
            disabled={ledgersLoading}
            className="h-9 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {(ledgers ?? []).map((l) => (
              <option key={l.name} value={l.name}>
                {l.name} ({l.domain}/{l.region}
                {l.currency ? `, ${l.currency}` : ""})
              </option>
            ))}
          </select>
        </div>

        <div className="grid flex-1 gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Prefix
          </label>
          <div className="flex gap-2">
            <Input
              value={prefixInput}
              onChange={(e) => setPrefixInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(prefixInput)}
              placeholder="assets:banks"
              className="font-mono text-sm"
            />
            <Button onClick={() => runSearch(prefixInput)} disabled={!prefixInput.trim()}>
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PREFIXES.map((q) => (
          <Button
            key={q.prefix}
            variant={activePrefix === q.prefix ? "default" : "outline"}
            size="sm"
            onClick={() => runSearch(q.prefix)}
          >
            {q.label}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {!activePrefix ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Search className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Enter a prefix or pick a quick filter to search.</p>
          </div>
        ) : accountsLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Account", "Type", "Balance"].map((h) => (
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
                {(page?.items ?? []).map((row) => (
                  <AccountRow key={row.account} row={row} />
                ))}
                {(page?.items ?? []).length === 0 && <EmptyRow cols={3} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activePrefix && (page?.items.length ?? 0) > 0 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goBack} disabled={cursorStack.length === 0}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={goNext} disabled={!page?.nextCursor || isFetching}>
            {isFetching ? "Loading…" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}

function AccountRow({ row }: { row: AccountRowDto }) {
  const balanceEntries = Object.entries(row.balances);
  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/40">
      <td className="px-6 py-3.5 font-mono text-xs">{row.account}</td>
      <td className="px-6 py-3.5">
        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
          {row.type}
        </span>
      </td>
      <td className="px-6 py-3.5 font-mono text-xs">
        {balanceEntries.length === 0
          ? "—"
          : balanceEntries.map(([asset, amount]) => (
              <div key={asset}>
                {amount.toLocaleString()} {asset}
              </div>
            ))}
      </td>
    </tr>
  );
}
