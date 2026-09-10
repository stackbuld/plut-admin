import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cryptoWithdrawalQueries } from "@/api/crypto-withdrawals";
import type { AdminCryptoWithdrawal } from "@/api/types/crypto-withdrawals.types";
import {
  CryptoWithdrawalStatusBadge,
  formatCrypto,
  isCryptoWithdrawalAttention,
  isCryptoWithdrawalStuck,
  canRetryCryptoWithdrawalSubmission,
} from "@/components/plut/crypto/CryptoWithdrawalStatusBadge";
import { ApproveCryptoWithdrawalDialog } from "@/components/plut/crypto/ApproveCryptoWithdrawalDialog";
import { RejectCryptoWithdrawalDialog } from "@/components/plut/crypto/RejectCryptoWithdrawalDialog";
import { RetryCryptoWithdrawalSubmissionAction } from "@/components/plut/crypto/RetryCryptoWithdrawalSubmissionAction";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";

// Not paginated — the confirmed backend handler (GetAdminCryptoWithdrawalsQuery) returns a flat
// array, no page/pageSize params exist on this endpoint (04-WITHDRAWALS.md §3). "Pending only"
// maps directly to ?pendingOnly=true; everything else (asset/status filters) would be client-side
// on top of whichever list is already fetched — not built here since the doc doesn't ask for more
// than the attention/all split, and adding unrequested filter UI isn't worth the surface area yet.
export const Route = createFileRoute("/_app/admin/crypto/withdrawals/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(cryptoWithdrawalQueries.list({ pendingOnly: false }));
  },
  component: CryptoWithdrawalsList,
});

function CryptoWithdrawalsList() {
  const [pendingOnly, setPendingOnly] = useState(false);
  const [toApprove, setToApprove] = useState<AdminCryptoWithdrawal | null>(null);
  const [toReject, setToReject] = useState<AdminCryptoWithdrawal | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery(
    cryptoWithdrawalQueries.list({ pendingOnly }),
  );

  const items = data ?? [];
  const attention = items.filter((w) => isCryptoWithdrawalAttention(w.status, w.createdAt));
  const others = items.filter((w) => !attention.includes(w));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Withdrawals</h1>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={pendingOnly} onCheckedChange={setPendingOnly} />
            <span className="text-sm text-muted-foreground">Pending only</span>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end text-xs text-muted-foreground">
        {isLoading
          ? "Loading…"
          : `${items.length.toLocaleString()} withdrawal${items.length === 1 ? "" : "s"}`}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState pendingOnly={pendingOnly} />
      ) : (
        <div className="space-y-6">
          {attention.length > 0 && (
            <Section title="Needs attention" tone="amber">
              {attention.map((w) => (
                <Row
                  key={w.id}
                  w={w}
                  onApprove={() => setToApprove(w)}
                  onReject={() => setToReject(w)}
                />
              ))}
            </Section>
          )}
          {others.length > 0 && (
            <Section title={attention.length > 0 ? "All withdrawals" : "Withdrawals"}>
              {others.map((w) => (
                <Row key={w.id} w={w} />
              ))}
            </Section>
          )}
        </div>
      )}

      <ApproveCryptoWithdrawalDialog
        withdrawal={toApprove}
        open={!!toApprove}
        onOpenChange={(o) => !o && setToApprove(null)}
      />
      <RejectCryptoWithdrawalDialog
        withdrawal={toReject}
        open={!!toReject}
        onOpenChange={(o) => !o && setToReject(null)}
      />
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "amber";
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3
        className={cn(
          "text-[11px] font-bold uppercase tracking-wider",
          tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  w,
  onApprove,
  onReject,
}: {
  w: AdminCryptoWithdrawal;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const isPending = w.status === "PendingApproval";
  const stuck = isCryptoWithdrawalStuck(w.status, w.createdAt);
  const canRetry = canRetryCryptoWithdrawalSubmission(w.status);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors",
        (isPending || stuck) && "border-amber-500/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {(isPending || stuck) && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-sm font-semibold">{formatCrypto(w.amount, w.asset)}</span>
            <CryptoWithdrawalStatusBadge status={w.status} />
            <span className="text-xs text-muted-foreground">{w.approvalMethod}</span>
          </div>
          <Link
            to="/admin/crypto/withdrawals/$withdrawalId"
            params={{ withdrawalId: w.id }}
            className="block"
          >
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <UserRef userId={w.userId} className="font-mono">
                {truncId(w.userId, 18)}
              </UserRef>
              <span>· {w.network}</span>
              {stuck && <span className="text-destructive">· stuck {relativeTime(w.createdAt)}</span>}
            </p>
          </Link>
        </div>

        <div className="text-right">
          <Link to="/admin/crypto/withdrawals/$withdrawalId" params={{ withdrawalId: w.id }}>
            <p className="text-[11px] text-muted-foreground">
              net {formatCrypto(w.networkFee, w.asset)} · plt {formatCrypto(w.platformFee, w.asset)}
            </p>
            <p className="text-[11px] text-muted-foreground">{relativeTime(w.createdAt)}</p>
          </Link>
        </div>
      </div>

      {isPending && onApprove && onReject && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Button size="sm" onClick={onApprove} className="flex-1">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} className="flex-1">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}

      {canRetry && (
        <div className="mt-3 flex border-t border-border pt-3">
          <RetryCryptoWithdrawalSubmissionAction withdrawalId={w.id} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ pendingOnly }: { pendingOnly: boolean }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      {pendingOnly
        ? "✅ All caught up — no withdrawals pending approval."
        : "No withdrawals found."}
    </div>
  );
}
