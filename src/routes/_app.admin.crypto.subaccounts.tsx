import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/crypto/subaccounts")({
  head: () => ({ meta: [{ title: "Crypto Sub-Accounts — Plut Admin" }] }),
  component: () => <Outlet />,
});
