import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { AlertTriangle, ArrowRight, History, Radio } from "lucide-react";
import { TabLoader } from "@/components/plut/catalog-shared";
import { ledgerQueries } from "@/api/ledger";
import { floatQueries } from "@/api/ledger-float";
import { ledgerTransactionQueries } from "@/api/ledger-transactions";
import { correctionsQueries } from "@/api/ledger-corrections";
import { healthQueries } from "@/api/ledger-health";
import { formatDateTime } from "@/lib/format";

// docs/ledger-service-docs/admin-console/01-DASHBOARD.md — the front door, purely composed from
// other screens' endpoints (§3: "No new endpoints").
export const Route = createFileRoute("/_app/admin/ledger/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(ledgerQueries.ledgers());
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data: ledgers } = useQuery(ledgerQueries.ledgers());
  const [ledger, setLedger] = useState("");

  useEffect(() => {
    if (!ledger && ledgers && ledgers.length > 0) setLedger(ledgers[0].name);
  }, [ledger, ledgers]);

  const { data: floatAccounts, isLoading: floatLoading } = useQuery(floatQueries.accounts(ledger));

  const todayIso = startOfDay(new Date()).toISOString();
  const { data: todayTx, isLoading: activityLoading } = useQuery(
    ledgerTransactionQueries.list({ ledger, from: todayIso, limit: 200 }),
  );

  const { data: audit, isLoading: auditLoading } = useQuery(correctionsQueries.audit(ledger, 1));
  const { data: jobs, isLoading: jobsLoading } = useQuery(healthQueries.jobs());

  // "Unmonitorable" accounts hold several assets at once, so their threshold can't be evaluated —
  // a config detail, not an alert. Counting them here (as "anything not Healthy" did) put a standing
  // false alarm on the dashboard.
  const alerts = (floatAccounts ?? [])
    .filter((a) => a.status === "Critical" || a.status === "Low")
    .slice(0, 5);
  const recentCorrections = (audit?.items ?? []).slice(0, 5);

  const volumeByAsset = new Map<string, number>();
  for (const row of todayTx ?? []) {
    volumeByAsset.set(row.assetCode, (volumeByAsset.get(row.assetCode) ?? 0) + row.amountMinor);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Ledger Admin</h1>
        <div className="grid gap-1.5">
          <select
            value={ledger}
            onChange={(e) => setLedger(e.target.value)}
            className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          >
            {(ledgers ?? []).map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title={`Float Alerts${alerts.length ? ` (${alerts.length})` : ""}`}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          linkTo="/admin/ledger/float"
        >
          {floatLoading ? (
            <TabLoader />
          ) : alerts.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              All monitored accounts are healthy.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((a) => (
                <li key={a.account} className="flex items-center justify-between py-2 text-xs">
                  <span className="truncate font-mono text-muted-foreground">{a.account}</span>
                  <span
                    className={
                      a.status === "Critical"
                        ? "font-semibold text-destructive"
                        : "font-semibold text-amber-600 dark:text-amber-400"
                    }
                  >
                    {a.status === "Critical" ? "Empty" : "Running low"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="System Health" icon={<Radio className="h-4 w-4 text-muted-foreground" />} linkTo="/admin/ledger/health">
          {jobsLoading ? (
            <TabLoader />
          ) : (
            <ul className="divide-y divide-border">
              {(jobs ?? []).map((row) => (
                <li key={`${row.job}-${row.ledger ?? ""}`} className="flex items-center justify-between py-2 text-xs">
                  <span className="truncate">{row.job}</span>
                  <span
                    className={
                      row.status === "OK"
                        ? "font-semibold text-success"
                        : row.status === "Error"
                          ? "font-semibold text-destructive"
                          : "font-semibold text-amber-600 dark:text-amber-400"
                    }
                  >
                    {row.status === "OK" ? "OK" : row.detail ?? row.status}
                  </span>
                </li>
              ))}
              {(jobs ?? []).length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No job runs recorded yet.</p>
              )}
            </ul>
          )}
        </Card>

        <Card
          title="Today's Activity"
          icon={<History className="h-4 w-4 text-muted-foreground" />}
          linkTo="/admin/ledger/transactions"
        >
          {activityLoading ? (
            <TabLoader />
          ) : (
            <div className="space-y-1 py-2">
              <p className="text-2xl font-semibold">{(todayTx ?? []).length.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">transactions today</p>
              {Array.from(volumeByAsset.entries()).map(([asset, minor]) => (
                <p key={asset} className="text-xs text-muted-foreground">
                  {minor.toLocaleString()} {asset}
                </p>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recent Corrections"
          icon={<History className="h-4 w-4 text-muted-foreground" />}
          linkTo="/admin/ledger/corrections/audit"
        >
          {auditLoading ? (
            <TabLoader />
          ) : recentCorrections.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No corrections yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentCorrections.map((row) => (
                <li key={row.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="truncate">
                    {row.adminEmail} — {row.action}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  linkTo,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  linkTo: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
