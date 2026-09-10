import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cryptoDepositQueries } from "@/api/crypto-deposits";
import type { UnmatchedCryptoDepositDto } from "@/api/types/crypto-deposits.types";
import { cryptoTransactionQueries } from "@/api/crypto-transactions";
import { CryptoTransactionStatusBadge } from "@/components/plut/crypto/CryptoTransactionStatusBadge";
import { formatCrypto } from "@/components/plut/crypto/CryptoWithdrawalStatusBadge";
import { MatchDepositToUserDialog } from "@/components/plut/crypto/MatchDepositToUserDialog";
import { ResolveDepositWithoutCreditingDialog } from "@/components/plut/crypto/ResolveDepositWithoutCreditingDialog";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { TablePager } from "@/components/plut/catalog-shared";
import { formatDateTime, formatUsd, relativeTime, truncId } from "@/lib/format";
import { cn } from "@/lib/utils";

// 03-DEPOSITS.md §2 describes one route with two tabs (Matched / Unmatched). The Unmatched tab is
// the actual new surface this doc introduces and is fully built below, resolved-toggle included.
//
// The doc says the Matched tab should "render 05-TRANSACTIONS_EXPLORER.md's table pre-filtered to
// type=Deposit, reusing that screen's component — do not build a second transaction table here."
// That screen's route (_app.admin.crypto.transactions.index.tsx) builds its table inline rather
// than as a separately exported component, and it's outside this task's file boundaries to edit.
// So the Matched tab below is a deliberately minimal table (Amount/User/Fee/Status/When — no Type
// column since it's always Deposit here, no filters since the doc doesn't ask for any beyond the
// type split) built directly against the same confirmed cryptoTransactionQueries API that screen
// uses, with a link out to the full Transactions Explorer for anything needing more filtering.
export const Route = createFileRoute("/_app/admin/crypto/deposits/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(cryptoDepositQueries.unmatchedList({ resolved: false }));
  },
  component: CryptoDepositsScreen,
});

function CryptoDepositsScreen() {
  // Kept loaded regardless of which tab/toggle state is active so the "Unmatched (N)" tab badge
  // always reflects the triage queue count, not whichever resolved filter happens to be selected.
  const { data: unresolvedCount } = useQuery(cryptoDepositQueries.unmatchedList({ resolved: false }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Deposits</h1>
        <p className="text-sm text-muted-foreground">
          Unmatched deposits are real, unaccounted-for user funds — investigate on Binance before
          resolving any row.
        </p>
      </div>

      <Tabs defaultValue="unmatched">
        <TabsList>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="unmatched">
            Unmatched{unresolvedCount ? ` (${unresolvedCount.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matched">
          <MatchedDepositsTab />
        </TabsContent>

        <TabsContent value="unmatched">
          <UnmatchedDepositsQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MATCHED_PAGE_SIZE = 20;

function MatchedDepositsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(MATCHED_PAGE_SIZE);

  const { data, isLoading, isFetching, refetch } = useQuery(
    cryptoTransactionQueries.list({ type: "Deposit", page, pageSize }),
  );

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Already credited deposits — a{" "}
          <code className="font-mono text-[11px]">type=Deposit</code> slice of the full{" "}
          <Link
            to="/admin/crypto/transactions"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            Transactions Explorer <ArrowUpRight className="h-3 w-3" />
          </Link>
          .
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${(data?.totalCount ?? 0).toLocaleString()} deposit${(data?.totalCount ?? 0) === 1 ? "" : "s"}`}
          </span>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No matched deposits yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold text-right">Fee (Platform+Spread)</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      to="/admin/crypto/transactions/$transactionId"
                      params={{ transactionId: tx.id }}
                      className="hover:underline"
                    >
                      {tx.asset}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </td>
                  <td className="px-4 py-3">
                    <UserRef userId={tx.userId} className="font-mono text-xs text-primary hover:underline">
                      {truncId(tx.userId, 14)}
                    </UserRef>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatUsd(tx.platformFee)} + {tx.spreadFee > 0 ? formatUsd(tx.spreadFee) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <CryptoTransactionStatusBadge status={tx.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {relativeTime(tx.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (data?.totalCount ?? 0) > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
          noun="deposit"
        />
      )}
    </div>
  );
}

function UnmatchedDepositsQueue() {
  const [showResolved, setShowResolved] = useState(false);
  const [toMatch, setToMatch] = useState<UnmatchedCryptoDepositDto | null>(null);
  const [toResolve, setToResolve] = useState<UnmatchedCryptoDepositDto | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery(
    cryptoDepositQueries.unmatchedList({ resolved: showResolved }),
  );

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={showResolved} onCheckedChange={setShowResolved} />
          <span className="text-sm text-muted-foreground">Show resolved history</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${items.length.toLocaleString()} deposit${items.length === 1 ? "" : "s"}`}
          </span>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState showResolved={showResolved} />
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <DepositRow
              key={d.id}
              deposit={d}
              onMatch={() => setToMatch(d)}
              onResolve={() => setToResolve(d)}
            />
          ))}
        </div>
      )}

      <MatchDepositToUserDialog
        deposit={toMatch}
        open={!!toMatch}
        onOpenChange={(o) => !o && setToMatch(null)}
      />
      <ResolveDepositWithoutCreditingDialog
        deposit={toResolve}
        open={!!toResolve}
        onOpenChange={(o) => !o && setToResolve(null)}
      />
    </div>
  );
}

function DepositRow({
  deposit: d,
  onMatch,
  onResolve,
}: {
  deposit: UnmatchedCryptoDepositDto;
  onMatch: () => void;
  onResolve: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        !d.isResolved && "border-amber-500/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{formatCrypto(d.amount, d.asset)}</span>
            <span className="text-xs text-muted-foreground">{d.network}</span>
            {d.isResolved ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Resolved
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                Needs triage
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sub-account (Binance):{" "}
            <span className="font-mono">{d.exchangeSubAccountId}</span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={d.txHash}>
            tx {truncId(d.txHash, 24)}
          </p>
          {d.isResolved && d.resolutionNotes && (
            <p className="mt-1.5 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs text-muted-foreground">
              {d.resolutionNotes}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">
            first seen {relativeTime(d.firstObservedAt)}
          </p>
          {d.isResolved && d.resolvedAt && (
            <p className="text-[11px] text-muted-foreground">
              resolved {formatDateTime(d.resolvedAt)}
            </p>
          )}
        </div>
      </div>

      {!d.isResolved && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Button size="sm" onClick={onMatch} className="flex-1">
            Match to User
          </Button>
          <Button size="sm" variant="outline" onClick={onResolve} className="flex-1">
            Resolve Without Crediting
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ showResolved }: { showResolved: boolean }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      {showResolved
        ? "No resolved deposits yet."
        : "✅ All caught up — no unmatched deposits waiting on triage."}
    </div>
  );
}
