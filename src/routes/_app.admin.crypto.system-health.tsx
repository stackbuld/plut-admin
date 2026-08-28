import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { cryptoSystemHealthQueries } from "@/api";
import type { CryptoWorkerHealthDto, CryptoWorkerHealthStatus } from "@/api/types";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Route/API background: docs/wallet-service-docs/crypto-wallet/admin-console/12-SYSTEM_HEALTH.md
// Backend is fully built (SystemHealthController) — this route is pure frontend against it.
//
// Deliberately a plain status board, not a chart-heavy dashboard (per the doc's §2/§4): one row per
// worker, a colored status dot, name, relative last-run time, and the detail string when present.
// No cursor/queue-depth columns from the doc's illustrative mockup — the real, already-built DTO is
// just { name, status, lastRunAt, detail }, and `detail` already carries that kind of context as text
// (e.g. "Queue depth: 0, rate budget used: 12/900") when the backend has it to give.
// No start/stop/restart controls anywhere — observability only (§4).

export const Route = createFileRoute("/_app/admin/crypto/system-health")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(cryptoSystemHealthQueries.workers());
  },
  component: SystemHealthPage,
});

// green=Healthy, amber=Degraded, red=Stalled, gray=Disabled — matches the doc's own dot semantics
// (§2) and this codebase's existing amber/destructive/success/muted badge convention (see
// CryptoWithdrawalStatusBadge.tsx, BinanceKycStatusBadge.tsx).
const STATUS_STYLES: Record<
  CryptoWorkerHealthStatus,
  { dot: string; label: string; labelClassName: string }
> = {
  Healthy: { dot: "bg-success", label: "Healthy", labelClassName: "text-success" },
  Degraded: { dot: "bg-amber-500", label: "Degraded", labelClassName: "text-amber-600 dark:text-amber-400" },
  Stalled: { dot: "bg-destructive", label: "Stalled", labelClassName: "text-destructive" },
  Disabled: { dot: "bg-muted-foreground/40", label: "Disabled", labelClassName: "text-muted-foreground" },
};

function SystemHealthPage() {
  const { data, isLoading, isError, error, isFetching } = useQuery(cryptoSystemHealthQueries.workers());
  const workers = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">System Health</h1>
          <p className="text-xs text-muted-foreground">
            Live status of the background workers that keep deposits, withdrawals, wallet
            activation, and Binance KYC reconciliation moving. Observability only — no remote
            start/stop/restart controls here; a stuck worker needs a process restart, not an
            admin-console action.
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] text-muted-foreground transition-opacity",
            isFetching ? "opacity-100" : "opacity-0",
          )}
        >
          <RefreshCw className="h-3 w-3 animate-spin" /> Refreshing…
        </div>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : isError ? (
          <div className="p-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load worker health."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {workers.map((worker) => (
              <WorkerRow key={worker.name} worker={worker} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WorkerRow({ worker }: { worker: CryptoWorkerHealthDto }) {
  const style = STATUS_STYLES[worker.status];

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-4">
      <div className="flex items-center gap-3">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", style.dot)} aria-hidden />
        <div>
          <div className="text-sm font-medium">{worker.name}</div>
          {worker.detail && (
            <div className="mt-0.5 text-xs text-muted-foreground">{worker.detail}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className={cn("font-semibold", style.labelClassName)}>{style.label}</span>
        <span className="text-muted-foreground">
          {worker.lastRunAt ? `Last run: ${relativeTime(worker.lastRunAt)}` : "No run recorded yet"}
        </span>
      </div>
    </li>
  );
}
