import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { vasQueries } from "@/api/vas";
import type { VasProviderTransactionLog } from "@/api/types/vas.types";
import { VasTransactionStatusBadge, formatVasAmount } from "@/components/plut/vas/VasStatusBadges";
import { VasTransactionActions } from "@/components/plut/vas/VasTransactionActions";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { formatDateTime, truncId } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/vas/transactions/$transactionId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(vasQueries.transactionDetail(params.transactionId));
  },
  component: VasTransactionDetail,
});

function VasTransactionDetail() {
  const { transactionId } = Route.useParams();
  const { data: t, isLoading } = useQuery(vasQueries.transactionDetail(transactionId));

  if (isLoading || !t) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/admin/vas/transactions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to transactions
      </Link>

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <VasTransactionStatusBadge status={t.status} />
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {t.serviceCategoryId}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{t.transactionReference}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold">
              {formatVasAmount(t.amount, t.currencyCode)}
            </p>
            {t.feeAmount != null && t.feeAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                fee {formatVasAmount(t.feeAmount, t.feeCurrencyCode ?? t.currencyCode)}
              </p>
            )}
          </div>
        </div>

        {t.lastErrorMessage && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {t.lastErrorCode && <span className="font-mono text-xs">[{t.lastErrorCode}] </span>}
            {t.lastErrorMessage}
          </div>
        )}

        <Section title="Customer">
          <Row label="User">
            <UserRef userId={t.userId} className="font-mono text-xs">
              {truncId(t.userId, 20)}
            </UserRef>
          </Row>
          <Row
            label="Beneficiary"
            value={`${t.customerIdentifierValue} (${t.customerIdentifierType})`}
          />
          {t.customerName && <Row label="Name" value={t.customerName} />}
        </Section>

        <Section title="Timing">
          <Row label="Initiated" value={formatDateTime(t.initiatedAt)} />
          {t.providerCalledAt && (
            <Row label="Provider called" value={formatDateTime(t.providerCalledAt)} />
          )}
          {t.completedAt && <Row label="Completed" value={formatDateTime(t.completedAt)} />}
          {t.failedAt && <Row label="Failed" value={formatDateTime(t.failedAt)} />}
          {t.refundedAt && <Row label="Refunded" value={formatDateTime(t.refundedAt)} />}
        </Section>

        <VasTransactionActions transaction={t} />
      </div>

      <Panel title="Money movement">
        <Row label="Wallet debit tx" value={t.walletDebitTransactionId} mono />
        <Row label="Wallet ledger tx" value={t.walletLedgerTxId} mono />
        <Row label="Wallet settlement ref" value={t.walletSettlementReference} mono />
      </Panel>

      <Panel title="Provider interaction">
        <Row label="Provider" value={t.providerName ?? t.providerCode} />
        <Row label="Provider tx ref" value={t.providerTransactionReference} mono />
        <Row label="Provider external ref" value={t.providerExternalReference} mono />
        <Row label="Retry count" value={String(t.retryCount)} />
      </Panel>

      {t.commission && (
        <Panel title="Commission">
          <Row
            label="Commission earned"
            value={formatVasAmount(t.commission.commissionEarned, t.commission.currencyCode)}
            strong
          />
          <Row
            label="Net payable to provider"
            value={formatVasAmount(t.commission.netPayableToProvider, t.commission.currencyCode)}
          />
        </Panel>
      )}

      <Panel title="Fulfillment">
        {t.fulfillment ? (
          <>
            <Row label="Type" value={t.fulfillment.fulfillmentType} />
            {t.fulfillment.tokenCode && <Row label="Token" value={t.fulfillment.tokenCode} mono />}
            {t.fulfillment.units && <Row label="Units" value={t.fulfillment.units} />}
            {t.fulfillment.receiptNumber && (
              <Row label="Receipt" value={t.fulfillment.receiptNumber} mono />
            )}
            {t.fulfillment.providerMessage && (
              <Row label="Provider message" value={t.fulfillment.providerMessage} />
            )}
          </>
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No fulfillment record — this category/outcome doesn't produce one.
          </p>
        )}
      </Panel>

      <Panel title="Provider request/response timeline">
        {t.providerLogs.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No provider calls recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {t.providerLogs.map((log) => (
              <ProviderLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ProviderLogRow({ log }: { log: VasProviderTransactionLog }) {
  return (
    <div className="rounded-lg border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold">
          {log.httpMethod} {log.endpoint}
        </span>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
            (log.isSuccess
              ? "bg-success/15 text-success"
              : log.isSuccess === false
                ? "bg-destructive/15 text-destructive"
                : "bg-secondary text-muted-foreground")
          }
        >
          {log.responseStatusCode ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">
          {log.responseLatencyMs}ms · attempt {log.retryAttempt + 1}
        </span>
      </div>
      {log.providerErrorMessage && (
        <p className="mt-1 text-xs text-destructive">
          {log.providerErrorCode && <span className="font-mono">[{log.providerErrorCode}] </span>}
          {log.providerErrorMessage}
        </p>
      )}
      {(log.requestPayload || log.responsePayload) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Raw request/response
          </summary>
          <div className="mt-2 space-y-2">
            {log.requestPayload && (
              <pre className="overflow-x-auto rounded bg-secondary/60 p-2 text-[11px]">
                {log.requestPayload}
              </pre>
            )}
            {log.responsePayload && (
              <pre className="overflow-x-auto rounded bg-secondary/60 p-2 text-[11px]">
                {log.responsePayload}
              </pre>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-border rounded-lg border bg-background">{children}</div>
    </section>
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
  strong,
  mono,
  children,
}: {
  label: string;
  value?: string | null;
  strong?: boolean;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  if (!children && (value === undefined || value === null || value === "")) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children ?? (
        <span className={(mono ? "font-mono text-xs " : "") + (strong ? "font-semibold" : "")}>
          {value}
        </span>
      )}
    </div>
  );
}
