import { createFileRoute, Outlet } from "@tanstack/react-router";

// docs/ledger-service-docs/admin-console/04-TRANSACTIONS_EXPLORER.md — layout shell for the list
// (.index.tsx) and detail (.$reference.tsx) child routes.
export const Route = createFileRoute("/_app/admin/ledger/transactions")({
  component: () => <Outlet />,
});
