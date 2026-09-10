import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/crypto/withdrawals")({
  head: () => ({ meta: [{ title: "Crypto Withdrawals — Plut Admin" }] }),
  component: () => <Outlet />,
});
