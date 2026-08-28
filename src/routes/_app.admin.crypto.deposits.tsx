import { createFileRoute, Outlet } from "@tanstack/react-router";

// Thin layout, matching the shipped _app.admin.crypto.assets.tsx / .withdrawals.tsx convention —
// tab state and data fetching live in the index route, this file only sets the page title.
export const Route = createFileRoute("/_app/admin/crypto/deposits")({
  head: () => ({ meta: [{ title: "Crypto Deposits — Plut Admin" }] }),
  component: () => <Outlet />,
});
