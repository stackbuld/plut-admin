import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, SearchX } from "lucide-react";
import { cryptoQueries } from "@/api/crypto";
import type { CryptoOperationStepDto } from "@/api/types/crypto.types";
import { OperationStatusBadge } from "@/components/plut/crypto/OperationStatusBadge";
import { BinanceKycStatusBadge } from "@/components/plut/crypto/BinanceKycStatusBadge";
import { OperationActions, canRetryKycShare } from "@/components/plut/crypto/OperationActions";
import {
  RefreshBinanceKycStatusButton,
  canRefreshBinanceKycStatus,
} from "@/components/plut/crypto/RefreshBinanceKycStatusButton";
import { KycAdequacyPanel } from "@/components/plut/crypto/KycAdequacyPanel";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime, truncId } from "@/lib/format";

// crypto-service returns 404 / CRYPTO_SUBACCOUNT_NOT_FOUND when a user has no sub-account row yet
// (e.g. their provisioning attempt failed before a sub-account was ever created) — a NORMAL,
// expected state, not a crash-worthy error. See src/api/client.ts: the fetcher throws
// Error(envelope.message), and this codebase's convention (see ApproveWithdrawalDialog's
// mapApproveError) is that `message` carries the backend's short error code, not prose.
const NOT_FOUND_CODE = "CRYPTO_SUBACCOUNT_NOT_FOUND";

export const Route = createFileRoute("/_app/admin/crypto/subaccounts/$userId")({
  loader: ({ context, params }) => {
    // Swallow prefetch errors here — a 404 is an expected outcome for this route, not a loader
    // failure that should bounce to an error boundary. The component's own useQuery below reads
    // the resulting error state and renders the appropriate empty/error UI.
    context.queryClient.ensureQueryData(cryptoQueries.detail(params.userId)).catch(() => {});
  },
  component: CryptoSubAccountDetail,
});

function CryptoSubAccountDetail() {
  const { userId } = Route.useParams();
  const { data: a, isLoading, isError, error } = useQuery(cryptoQueries.detail(userId));

  const backLink = (
    <Link
      to="/admin/crypto/subaccounts"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to sub-accounts
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof Error && error.message === NOT_FOUND_CODE;
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="rounded-2xl border bg-card p-8 text-center">
          {notFound ? (
            <>
              <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">No sub-account yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                This user doesn't have a Binance sub-account row yet — their provisioning attempt
                may have failed before one was ever created. Check the Operations admin view for
                diagnostics, or retry provisioning below.
              </p>
              <div className="mt-4 flex justify-center">
                <OperationActions userId={userId} />
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-3 text-sm font-semibold text-destructive">Couldn't load this user</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Unknown error."}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!a) return null;

  const showRetry = canRetryKycShare(a.kycShareStatus, a.latestOperation?.status);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {backLink}

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {a.status}
              </span>
              <BinanceKycStatusBadge status={a.kycShareStatus} />
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{a.exchangeSubAccountId}</p>
            <UserRef userId={a.userId} className="mt-1 inline-block text-xs text-muted-foreground">
              User {truncId(a.userId, 22)}
            </UserRef>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Created {formatDateTime(a.createdAt)}</p>
          </div>
        </div>

        {showRetry && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">This provisioning attempt needs attention.</span>
            <OperationActions userId={userId} />
          </div>
        )}
      </div>

      <Tabs defaultValue="kyc-sharing">
        <TabsList>
          <TabsTrigger value="kyc-sharing">KYC Sharing</TabsTrigger>
          <TabsTrigger value="steps">
            Step Timeline {a.latestOperation ? `(${a.latestOperation.steps.length})` : "(0)"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kyc-sharing">
          <KycSharingPanel userId={userId} />
        </TabsContent>
        <TabsContent value="steps">
          <StepTimelinePanel steps={a.latestOperation?.steps ?? []} />
        </TabsContent>
      </Tabs>

      {!showRetry && (
        <div className="flex justify-end">
          <OperationActions userId={userId} />
        </div>
      )}
    </div>
  );
}

function KycSharingPanel({ userId }: { userId: string }) {
  const { data: a } = useQuery(cryptoQueries.detail(userId));
  const {
    data: adequacy,
    isLoading: adequacyLoading,
    isError: adequacyError,
  } = useQuery(cryptoQueries.adequacy(userId));

  if (!a) return null;

  return (
    <div className="mt-2 space-y-4">
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Binance Status
          </h3>
          {canRefreshBinanceKycStatus(a.kycShareStatus) && (
            <RefreshBinanceKycStatusButton userId={userId} />
          )}
        </div>
        {/* Every field below beyond the operation's own step data may be null/stale until the
            async Binance webhook (05-WEBHOOK_AND_ASYNC_STATUS.md) is wired up. */}
        <div className="divide-y divide-border rounded-lg border bg-background">
          <Row
            label="KYC Share Status"
            value={<BinanceKycStatusBadge status={a.kycShareStatus} />}
          />
          <Row label="KYC Shared At" value={a.kycSharedAt ? formatDateTime(a.kycSharedAt) : "—"} />
          <Row label="Binance Request No." value={a.binanceKycRequestNo ?? "—"} mono />
          <Row
            label="Binance Raw Status"
            value={a.binanceKycRawStatus ?? "Not available yet"}
            mono
          />
          <Row
            label="Status Updated At"
            value={a.binanceKycStatusUpdatedAt ? formatDateTime(a.binanceKycStatusUpdatedAt) : "—"}
          />
        </div>
      </section>

      <KycAdequacyPanel result={adequacy} isLoading={adequacyLoading} isError={adequacyError} />
    </div>
  );
}

const STEP_ORDER = [
  "CreateSubAccountStep",
  "ShareKycDataStep",
  "CreateApiKeyStep",
  "RestrictIpStep",
];

function StepTimelinePanel({ steps }: { steps: CryptoOperationStepDto[] }) {
  if (steps.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No steps recorded yet — provisioning hasn't started, or no operation was found for this
        sub-account.
      </div>
    );
  }

  const ordered = [...steps].sort(
    (x, y) => STEP_ORDER.indexOf(x.stepName) - STEP_ORDER.indexOf(y.stepName),
  );

  return (
    <ol className="mt-2 space-y-3">
      {ordered.map((step, i) => (
        <li key={step.stepName} className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-sm font-semibold">{step.stepName}</span>
            <OperationStatusBadge status={step.status} />
            <span className="ml-auto text-xs text-muted-foreground">
              {step.attempts} attempt{step.attempts === 1 ? "" : "s"}
            </span>
          </div>

          {step.error && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {step.error}
            </div>
          )}

          {step.output && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Output
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-secondary/60 p-2 text-[11px]">
                {formatJson(step.output)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
