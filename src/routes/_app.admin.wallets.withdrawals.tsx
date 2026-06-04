import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/wallets/withdrawals")({
  head: () => ({ meta: [{ title: "Withdrawals — Plut Admin" }] }),
  component: () => <Outlet />,
});