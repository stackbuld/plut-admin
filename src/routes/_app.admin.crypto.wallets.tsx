import { createFileRoute, Outlet } from "@tanstack/react-router";

// Thin layout, matching the shipped _app.admin.crypto.subaccounts.tsx / .assets.tsx convention —
// the search box lives in the index route, this file only sets the page title and renders the
// child route. See docs/wallet-service-docs/crypto-wallet/admin-console/02-WALLETS_AND_USERS.md.
export const Route = createFileRoute("/_app/admin/crypto/wallets")({
  head: () => ({ meta: [{ title: "Wallets & Users — Plut Admin" }] }),
  component: () => <Outlet />,
});
