import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabLoader, EmptyRow } from "@/components/plut/catalog-shared";
import { ledgerQueries } from "@/api/ledger";
import { correctionsQueries } from "@/api/ledger-corrections";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md §2 "Audit history".
export const Route = createFileRoute("/_app/admin/ledger/corrections/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(correctionsQueries.audit(ledger, page));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <div className="grid gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ledger
          </label>
          <select
            value={ledger ?? ""}
            onChange={(e) => {
              setLedger(e.target.value || undefined);
              setPage(1);
            }}
            className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All ledgers</option>
            {(ledgers ?? []).map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <TabLoader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  {["Time", "Admin", "Action", "Ledger", "Target", "Reason", "Result"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                    <td className="px-6 py-3.5 text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                    <td className="px-6 py-3.5 text-xs">{row.adminEmail}</td>
                    <td className="px-6 py-3.5 text-xs font-medium">{row.action}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{row.ledger}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-muted-foreground">{row.targetReference}</td>
                    <td className="px-6 py-3.5 max-w-[220px] truncate text-xs" title={row.reason}>
                      {row.reason}
                    </td>
                    <td className="px-6 py-3.5">
                      {row.success ? (
                        <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(data?.items ?? []).length === 0 && <EmptyRow cols={7} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalCount > data.pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {data.page} — {data.totalCount} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * data.pageSize >= data.totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
