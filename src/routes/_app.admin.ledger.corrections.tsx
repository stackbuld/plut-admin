import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

// docs/ledger-service-docs/admin-console/05-CORRECTIONS_AND_MANUAL_POSTINGS.md — layout shell with
// tab nav for the three sibling screens (revert / post / audit).
export const Route = createFileRoute("/_app/admin/ledger/corrections")({
  component: CorrectionsLayout,
});

const TABS = [
  { to: "/admin/ledger/corrections/revert", label: "Revert a transaction" },
  { to: "/admin/ledger/corrections/post", label: "Post manual transfer" },
  { to: "/admin/ledger/corrections/audit", label: "Audit history" },
] as const;

function CorrectionsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Corrections & Manual Postings</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Undo a transaction that shouldn't have happened, or post a manual adjustment outside a
          normal user flow. Every action here is audited.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              pathname === tab.to || (pathname === "/admin/ledger/corrections" && tab.to.endsWith("revert"))
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
