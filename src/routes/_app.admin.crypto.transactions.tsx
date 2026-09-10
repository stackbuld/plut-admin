import { createFileRoute, Outlet } from "@tanstack/react-router";

// Thin layout, matching every other crypto-console screen's convention (assets/operations/
// withdrawals) — filtering/search/summary UI lives in the index route, this file only sets the
// page title and renders the child route.
export const Route = createFileRoute("/_app/admin/crypto/transactions")({
  head: () => ({ meta: [{ title: "Crypto Transactions — Plut Admin" }] }),
  component: () => <Outlet />,
});
