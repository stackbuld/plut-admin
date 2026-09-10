import { createFileRoute, Outlet } from "@tanstack/react-router";

// Thin layout, matching the shipped _app.admin.crypto.subaccounts.tsx convention — filtering/search
// UI lives in the index route (mirrors how subaccounts.index.tsx owns its own status-filter tabs)
// rather than here, so this file only sets the page title and renders the child route.
export const Route = createFileRoute("/_app/admin/crypto/assets")({
  head: () => ({ meta: [{ title: "Assets & Networks — Plut Admin" }] }),
  component: () => <Outlet />,
});
