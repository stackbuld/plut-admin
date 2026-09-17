import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { walletAuditQueries } from "@/api/wallets";
import type { WalletAdjustmentAudit } from "@/api/wallets";
import { formatDateTime } from "@/lib/format";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Every admin credit or debit ever made on a user wallet, who made it, and why.
 *
 * Until the wallet_admin_audit_logs table existed, an adjustment recorded only an `adminUserId`
 * buried in the transaction's metadata JSON — not queryable, and not written at all when the
 * adjustment FAILED. Failed attempts show here on purpose: a rejected large credit is as
 * interesting to an investigation as a successful one.
 */
export const Route = createFileRoute("/_app/admin/wallets/adjustments")({
  component: AdjustmentsAuditPage,
});

function AdjustmentsAuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery(walletAuditQueries.adjustments(undefined, page));

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Wallet Adjustments</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Every time an admin has added money to, or taken money out of, a user's wallet — including
          attempts that were rejected.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {isLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["When", "What", "User", "Amount", "Reason", "By", "Result"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <AuditRow key={row.id} row={row} />
                ))}
                {(data?.items ?? []).length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(data?.totalCount ?? 0) > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {data?.totalCount} adjustment
            {data?.totalCount === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({ row }: { row: WalletAdjustmentAudit }) {
  const isCredit = row.action === "Credit";
  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-secondary/40",
        !row.success && "bg-destructive/5",
      )}
    >
      <td className="px-5 py-3 whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTime(row.createdAt)}
      </td>
      <td className="px-5 py-3 whitespace-nowrap">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            isCredit
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {isCredit ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {isCredit ? "Added money" : "Took money out"}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="text-xs">{row.targetUserName ?? "—"}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{row.targetUserId}</div>
      </td>
      <td className="px-5 py-3 font-mono whitespace-nowrap">
        {currencySymbol(row.currency)}
        {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>
      <td className="max-w-[260px] px-5 py-3 text-xs">{row.narration}</td>
      <td className="px-5 py-3 text-xs">{row.adminEmail}</td>
      <td className="px-5 py-3">
        {row.success ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Done
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs text-destructive"
            title={row.errorDescription ?? undefined}
          >
            <XCircle className="h-3 w-3" /> {row.errorCode ?? "Rejected"}
          </span>
        )}
      </td>
    </tr>
  );
}
