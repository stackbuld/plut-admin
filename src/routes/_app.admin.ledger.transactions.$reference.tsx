import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { ledgerTransactionQueries } from "@/api/ledger-transactions";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/04-TRANSACTIONS_EXPLORER.md — reads directly off
// Formance's own transaction (via GetTransactionByReference) rather than posting_index rows, since
// this view needs the true posting order and full metadata blob, which only that call has.
export const Route = createFileRoute("/_app/admin/ledger/transactions/$reference")({
  validateSearch: (search: Record<string, unknown>) => ({ ledger: String(search.ledger ?? "") }),
  loaderDeps: ({ search }) => ({ ledger: search.ledger }),
  loader: ({ context, params, deps }) => {
    if (deps.ledger) {
      context.queryClient
        .ensureQueryData(ledgerTransactionQueries.detail(deps.ledger, params.reference))
        .catch(() => {});
    }
  },
  component: TransactionDetail,
});

function TransactionDetail() {
  const { reference } = Route.useParams();
  const { ledger } = Route.useSearch();
  const { data: tx, isLoading, isError, error } = useQuery(ledgerTransactionQueries.detail(ledger, reference));

  const backLink = (
    <Link
      to="/admin/ledger/transactions"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to transactions
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {backLink}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !tx) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {backLink}
        <div className="rounded-2xl border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm font-semibold text-destructive">Couldn't load this transaction</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {backLink}

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-mono text-base font-semibold">{tx.reference}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{tx.txType}</p>
          </div>
          <div className="text-right">
            {tx.reverted ? (
              <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                Reverted
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                Committed
              </span>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(tx.committedAt)}</p>
            <Link
              to="/admin/ledger/corrections/revert"
              search={{ ledger, reference }}
              className="mt-2 inline-block text-xs font-medium text-destructive hover:underline"
            >
              Revert this transaction
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Postings</h3>
          <div className="mt-2 space-y-2">
            {tx.postings.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-xs">
                <span className="flex-1 truncate font-mono">{p.source}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate font-mono">{p.destination}</span>
                <span className="shrink-0 font-mono font-semibold">
                  {p.amountMinor.toLocaleString()} {p.assetCode}
                </span>
              </div>
            ))}
          </div>
        </div>

        {tx.metadata && (
          <div className="mt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Metadata</h3>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-secondary/40 p-3 font-mono text-[11px]">
              {JSON.stringify(tx.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
