import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { liquidationQueries } from "@/api/crypto-liquidation";
import { DEFAULT_LIQUIDATION_PROVIDER } from "@/api/types/crypto-liquidation.types";
import { ReconcileLiquidationDialog } from "@/components/plut/crypto/ReconcileLiquidationDialog";
import { formatDateTime, relativeTime } from "@/lib/format";

// See docs/wallet-service-docs/crypto-wallet/admin-console/15-SELL_ORDERS_AND_LIQUIDATION.md §2 Part B.
// The one genuinely new screen this doc introduces — everything else in the Sell redesign's admin
// follow-up extends an existing screen (Transactions Explorer's Sell Settlement panel). Single-file
// route, mirroring crypto/treasury's shape (a primary table + a mutation-triggering dialog), since
// pool + history + the reconcile action all fit naturally on one page.
export const Route = createFileRoute("/_app/admin/crypto/liquidation")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(liquidationQueries.pool());
    context.queryClient.prefetchQuery(liquidationQueries.history());
  },
  component: LiquidationPage,
});

function LiquidationPage() {
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const { data: pool, isLoading: poolLoading } = useQuery(
    liquidationQueries.pool(DEFAULT_LIQUIDATION_PROVIDER),
  );
  const { data: history, isLoading: historyLoading } = useQuery(
    liquidationQueries.history(DEFAULT_LIQUIDATION_PROVIDER),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Liquidation Pool — {DEFAULT_LIQUIDATION_PROVIDER}</h1>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Crypto swept from user sub-accounts to master ahead of a Sell settling, earmarked for
            manual OTC sale. A growing, never-reconciled balance here means something isn't being
            sold — see docs/wallet-service-docs/crypto-wallet/features/08-SELL_CRYPTO.md.
          </p>
        </div>
        <Button onClick={() => setReconcileOpen(true)}>
          <Plus className="h-4 w-4" /> Reconcile
        </Button>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {poolLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Asset", "Pending Liquidation", "Last Reconciled"].map((h) => (
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
                {(pool ?? []).map((row) => (
                  <tr key={row.asset} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-mono font-semibold text-xs">{row.asset}</td>
                    <td className="px-6 py-3.5 font-mono">{row.pendingLiquidation}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {row.lastReconciledAt ? relativeTime(row.lastReconciledAt) : "never"}
                    </td>
                  </tr>
                ))}
                {(pool ?? []).length === 0 && <EmptyRow cols={3} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-3">
          <p className="text-sm font-semibold">Reconciliation History</p>
        </div>
        {historyLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Asset", "Sold Qty", "Proceeds", "Bank", "Admin", "Fiat Cleared", "When"].map((h) => (
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
                {(history?.items ?? []).map((row) => (
                  <tr key={row.batchId} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 font-mono font-semibold text-xs">{row.asset}</td>
                    <td className="px-6 py-3.5 font-mono">{row.soldQuantity}</td>
                    <td className="px-6 py-3.5 font-mono">
                      {(row.fiatProceedsMinor / 100).toLocaleString()} {row.fiatCurrency}
                    </td>
                    <td className="px-6 py-3.5 text-xs">{row.bankAccount}</td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{row.adminEmail}</td>
                    <td className="px-6 py-3.5">
                      {row.fiatClearingCompleted ? (
                        <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                          Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </td>
                  </tr>
                ))}
                {(history?.items ?? []).length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReconcileLiquidationDialog poolRows={pool ?? []} open={reconcileOpen} onOpenChange={setReconcileOpen} />
    </div>
  );
}
