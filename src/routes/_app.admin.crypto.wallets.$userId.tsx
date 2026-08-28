import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronRight, Loader2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cryptoWalletQueries } from "@/api/crypto-wallets";
import { cryptoTransactionQueries } from "@/api/crypto-transactions";
import { cryptoQueries } from "@/api/crypto";
import type { CryptoTransactionListItemDto } from "@/api/types/crypto-transactions.types";
import { CryptoWalletStatusBadge } from "@/components/plut/crypto/CryptoWalletStatusBadge";
import { CryptoTransactionStatusBadge } from "@/components/plut/crypto/CryptoTransactionStatusBadge";
import { BinanceKycStatusBadge } from "@/components/plut/crypto/BinanceKycStatusBadge";
import { FreezeCryptoWalletDialog } from "@/components/plut/crypto/FreezeCryptoWalletDialog";
import { SuspendCryptoWalletDialog } from "@/components/plut/crypto/SuspendCryptoWalletDialog";
import { UnfreezeCryptoWalletAction } from "@/components/plut/crypto/UnfreezeCryptoWalletAction";
import { formatCrypto } from "@/components/plut/crypto/CryptoWithdrawalStatusBadge";
import { relativeTime } from "@/lib/format";

// crypto-service returns 404 / CRYPTO_SUBACCOUNT_NOT_FOUND for users whose sub-account
// provisioning never got as far as creating one — a normal state here (this screen still shows
// wallets/activity for such a user), not a route-level error. Same code + swallow-on-prefetch
// pattern as _app.admin.crypto.subaccounts.$userId.tsx.
const SUBACCOUNT_NOT_FOUND_CODE = "CRYPTO_SUBACCOUNT_NOT_FOUND";

export const Route = createFileRoute("/_app/admin/crypto/wallets/$userId")({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(cryptoWalletQueries.byUser(params.userId));
    context.queryClient.ensureQueryData(cryptoTransactionQueries.list({
      userId: params.userId,
      page: 1,
      pageSize: 20,
    }));
    // Sub-account lookup is best-effort context (for the "Sub-account: ... · KYC Share: ..." line
    // and the link into Sub-Accounts detail) — a 404 here is expected for a user who never got far
    // enough into provisioning, so swallow the prefetch failure rather than failing the route.
    context.queryClient.ensureQueryData(cryptoQueries.detail(params.userId)).catch(() => {});
  },
  component: CryptoWalletsUserDetail,
});

function CryptoWalletsUserDetail() {
  const { userId } = Route.useParams();
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const {
    data: wallets,
    isLoading: walletsLoading,
    isError: walletsError,
    error: walletsErrorObj,
  } = useQuery(cryptoWalletQueries.byUser(userId));

  const backLink = (
    <Link
      to="/admin/crypto/wallets"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to search
    </Link>
  );

  if (walletsLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (walletsError) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="rounded-2xl border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm font-semibold text-destructive">Couldn't load this user's wallets</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {walletsErrorObj instanceof Error ? walletsErrorObj.message : "Unknown error."}
          </p>
        </div>
      </div>
    );
  }

  const walletList = wallets ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {backLink}

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-semibold">{userId}</p>
            <SubAccountSummary userId={userId} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFreezeOpen(true)}
              disabled={walletList.length === 0}
            >
              <Lock className="h-3.5 w-3.5" /> Freeze
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setSuspendOpen(true)}
              disabled={walletList.length === 0}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Suspend
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Wallets
        </h3>
        {walletList.length === 0 ? (
          <div className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            No crypto wallets for this user.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Asset</th>
                  <th className="px-4 py-2.5 font-semibold">Balance</th>
                  <th className="px-4 py-2.5 font-semibold">Locked</th>
                  <th className="px-4 py-2.5 font-semibold">Available</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {walletList.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-2.5 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        {w.asset}
                        {w.isDefault && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            default
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{formatCrypto(w.balance, w.asset)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCrypto(w.lockedBalance, w.asset)}
                    </td>
                    <td className="px-4 py-2.5">{formatCrypto(w.availableBalance, w.asset)}</td>
                    <td className="px-4 py-2.5">
                      <CryptoWalletStatusBadge status={w.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {w.status === "Frozen" && (
                        <UnfreezeCryptoWalletAction userId={userId} walletId={w.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RecentActivity userId={userId} />

      <FreezeCryptoWalletDialog
        userId={userId}
        wallets={walletList}
        open={freezeOpen}
        onOpenChange={setFreezeOpen}
      />
      <SuspendCryptoWalletDialog
        userId={userId}
        wallets={walletList}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
      />
    </div>
  );
}

/** Sub-account context line + link into Sub-Accounts detail, per 02-WALLETS_AND_USERS.md §2's
 * mockup ("Sub-account: exsub-4521 · KYC Share: ProviderApproved (link → Sub-Accounts detail)").
 * A 404 (CRYPTO_SUBACCOUNT_NOT_FOUND) is a normal state for a user whose provisioning never
 * created one — rendered as a plain "no sub-account yet" note rather than an error. */
function SubAccountSummary({ userId }: { userId: string }) {
  const { data, isLoading, isError, error } = useQuery(cryptoQueries.detail(userId));

  if (isLoading) {
    return <p className="mt-1 text-xs text-muted-foreground">Loading sub-account…</p>;
  }

  if (isError) {
    const notFound = error instanceof Error && error.message === SUBACCOUNT_NOT_FOUND_CODE;
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {notFound ? "No sub-account provisioned yet." : "Couldn't load sub-account info."}
      </p>
    );
  }

  if (!data) return null;

  return (
    <Link
      to="/admin/crypto/subaccounts/$userId"
      params={{ userId }}
      className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
    >
      Sub-account: <span className="font-mono">{data.exchangeSubAccountId}</span>
      <span>·</span>
      <span>KYC Share:</span>
      <BinanceKycStatusBadge status={data.kycShareStatus} />
      <ChevronRight className="h-3 w-3" />
    </Link>
  );
}

/** Thin, capped view (last 20) — this page does not attempt to be the full Transactions Explorer;
 * it links out pre-filtered to this user for the full, filterable history, per
 * 02-WALLETS_AND_USERS.md §2's note about not maintaining two places that render CryptoTransaction. */
function RecentActivity({ userId }: { userId: string }) {
  const { data, isLoading, isError, error } = useQuery(
    cryptoTransactionQueries.list({ userId, page: 1, pageSize: 20 }),
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Recent Activity {data ? `(last ${data.items.length})` : "(last 20)"}
        </h3>
        <Link
          to="/admin/crypto/transactions"
          search={{ userId }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          See all in Transactions Explorer <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Couldn't load recent activity
          {error instanceof Error ? ` — ${error.message}` : ""}.
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No recent activity for this user.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border bg-card">
          {data.items.map((t) => (
            <ActivityRow key={t.id} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityRow({ t }: { t: CryptoTransactionListItemDto }) {
  const rowClass = "flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-secondary/40";
  const inner = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <span className="font-semibold">{t.type}</span>
        <span className="text-xs text-muted-foreground">{t.asset}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span>{formatCrypto(t.amount, t.asset)}</span>
        <CryptoTransactionStatusBadge status={t.status} />
        <span className="text-muted-foreground">{relativeTime(t.createdAt)}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </>
  );

  // Withdrawal rows link into the existing Withdrawals module (which owns that entity's full
  // detail); every other type links into the Transactions Explorer, per the doc's mockup
  // ("Withdrawal ... (→ Withdrawals)" / "Buy ... (→ Transactions)"). Two explicit branches rather
  // than a shared dynamic props object, since each target route has its own `search` shape.
  if (t.type === "Withdrawal") {
    return (
      <Link to="/admin/crypto/withdrawals" className={rowClass}>
        {inner}
      </Link>
    );
  }

  return (
    <Link to="/admin/crypto/transactions" search={{ userId: t.userId }} className={rowClass}>
      {inner}
    </Link>
  );
}
