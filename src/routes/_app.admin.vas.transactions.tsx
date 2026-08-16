import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas/transactions")({
  head: () => ({ meta: [{ title: "VAS Transactions — Plut Admin" }] }),
  component: () => <Outlet />,
});
