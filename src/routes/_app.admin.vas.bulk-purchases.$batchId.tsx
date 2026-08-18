import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { vasQueries } from "@/api/vas";
import type { VasBulkBatchItem } from "@/api/types/vas.types";
import { formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { formatDateTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/bulk-purchases/$batchId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.bulkBatchDetail(params.batchId));
  },
  component: VasBulkBatchDetail,
});

function VasBulkBatchDetail() {
  const { batchId } = Route.useParams();
  const { data, isLoading } = useQuery(vasQueries.bulkBatchDetail(batchId));

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { batch, items } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to="/admin/vas/bulk-purchases"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to bulk purchases
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{batch.batchName}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {batch.batchReference ?? truncId(batch.id, 24)}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
            {batch.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Items" value={String(batch.totalItemCount)} />
          <Stat label="Succeeded" value={String(batch.successCount)} />
          <Stat label="Failed" value={String(batch.failureCount)} />
          <Stat
            label="Total amount"
            value={formatVasAmount(batch.totalEstimatedAmount, batch.currencyCode)}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Created {formatDateTime(batch.createdAt)}
        </p>
      </div>

      <section className="rounded-2xl border bg-card">
        <h3 className="border-b border-border px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Line items
        </h3>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No items on this batch.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Beneficiary</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <ItemRow key={item.lineNumber} item={item} currencyCode={batch.currencyCode} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ItemRow({ item, currencyCode }: { item: VasBulkBatchItem; currencyCode: string }) {
  const isFailed = item.errorMessage != null;
  return (
    <tr className="align-top hover:bg-secondary/30">
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.lineNumber}</td>
      <td className="px-4 py-2.5 text-xs">{item.serviceCategoryId}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.customerIdentifierValue}</td>
      <td className="px-4 py-2.5 text-right font-mono text-xs">
        {formatVasAmount(item.amount, currencyCode)}
      </td>
      <td className="px-4 py-2.5">
        <span
          className={
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
            (isFailed
              ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
              : "bg-secondary text-foreground")
          }
        >
          {item.status}
        </span>
        {item.errorMessage && (
          <p className="mt-1 max-w-xs text-[11px] text-destructive">{item.errorMessage}</p>
        )}
      </td>
      <td className="px-4 py-2.5">
        {item.vasTransactionId ? (
          <Link
            to="/admin/vas/transactions/$transactionId"
            params={{ transactionId: item.vasTransactionId }}
            className="font-mono text-xs text-primary hover:underline"
          >
            {truncId(item.vasTransactionId)}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
