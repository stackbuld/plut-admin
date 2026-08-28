import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cryptoTransactionQueries } from "@/api/crypto-transactions";
import type { CryptoTransactionDetailDto } from "@/api/types/crypto-transactions.types";
import { CryptoTransactionStatusBadge } from "@/components/plut/crypto/CryptoTransactionStatusBadge";
import { formatCrypto } from "@/components/plut/crypto/CryptoWithdrawalStatusBadge";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime, formatUsd, truncId } from "@/lib/format";

// This screen's own detail view only covers the fields common to every transaction type (the
// CryptoTransaction row itself) — it is a routing hub to the richer per-type screens, not a
// replacement for them (05-TRANSACTIONS_EXPLORER.md §2). At most one of
// childOrderId/childSwapId/childWithdrawalId is non-null:
//   - childWithdrawalId -> links straight into the existing Withdrawals detail page.
//   - childOrderId/childSwapId -> no dedicated detail page exists yet for CryptoOrder/CryptoSwap,
//     rendered as plain text rather than a broken link (per the doc's own explicit instruction).
export const Route = createFileRoute("/_app/admin/crypto/transactions/$transactionId")({
  loader: ({ context, params }) => {
    context.queryClient
      .ensureQueryData(cryptoTransactionQueries.detail(params.transactionId))
      .catch(() => {});
  },
  component: CryptoTransactionDetail,
});

function CryptoTransactionDetail() {
  const { transactionId } = Route.useParams();
  const {
    data: tx,
    isLoading,
    isError,
    error,
  } = useQuery(cryptoTransactionQueries.detail(transactionId));

  const backLink = (
    <Link
      to="/admin/crypto/transactions"
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
          <p className="mt-3 text-sm font-semibold text-destructive">
            Couldn't load this transaction
          </p>
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{tx.type}</h1>
              <span className="text-xs text-muted-foreground">{tx.direction}</span>
              <CryptoTransactionStatusBadge status={tx.status} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCrypto(tx.amount, tx.asset)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Net {formatCrypto(tx.netAmount, tx.asset)}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Created {formatDateTime(tx.createdAt)}</p>
            <p>Updated {formatDateTime(tx.updatedAt)}</p>
          </div>
        </div>

        <Section title="User">
          <Row
            label="User"
            value={
              <UserRef userId={tx.userId} className="font-mono text-xs text-primary hover:underline">
                {truncId(tx.userId, 22)}
              </UserRef>
            }
          />
        </Section>

        <Section title="Fees">
          <Row label="Network Fee" value={formatCrypto(tx.networkFee, tx.asset)} hint="pass-through" />
          <Row label="Platform Fee" value={formatUsd(tx.platformFee)} hint="Plut revenue" />
          <Row label="Spread Fee" value={formatUsd(tx.spreadFee)} hint="Plut revenue" />
        </Section>

        <Section title="Ledger">
          <Row label="Ledger Transaction" value={<CopyableId value={tx.ledgerTransactionId} />} />
          <Row
            label="External Tx Hash"
            value={tx.externalTxHash ? <CopyableId value={tx.externalTxHash} /> : "—"}
          />
          <Row label="Idempotency Key" value={<CopyableId value={tx.idempotencyKey} />} />
          <Row label="Correlation Id" value={<CopyableId value={tx.correlationId} />} />
        </Section>

        <ChildLink tx={tx} />

        {tx.metadata != null && (
          <Section title="Metadata">
            <div className="px-3 py-2">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-secondary/40 p-3 font-mono text-[11px]">
                {JSON.stringify(tx.metadata, null, 2)}
              </pre>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function ChildLink({ tx }: { tx: CryptoTransactionDetailDto }) {
  if (tx.childWithdrawalId) {
    return (
      <Section title="Related Record">
        <div className="px-3 py-2.5">
          <Link
            to="/admin/crypto/withdrawals/$withdrawalId"
            params={{ withdrawalId: tx.childWithdrawalId }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View withdrawal detail <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Section>
    );
  }

  if (tx.childOrderId) {
    return (
      <Section title="Related Record">
        <Row
          label="Order"
          value={<CopyableId value={tx.childOrderId} />}
          hint="no order detail page yet"
        />
      </Section>
    );
  }

  if (tx.childSwapId) {
    return (
      <Section title="Related Record">
        <Row
          label="Swap"
          value={<CopyableId value={tx.childSwapId} />}
          hint="no swap detail page yet"
        />
      </Section>
    );
  }

  return null;
}

function CopyableId({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="break-all font-mono text-xs">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("Copied");
        }}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        title="Copy"
      >
        <Copy className="h-3 w-3" />
      </button>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2 divide-y divide-border rounded-lg border bg-background">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-muted-foreground/70">({hint})</span>}
      </span>
      <span>{value}</span>
    </div>
  );
}
