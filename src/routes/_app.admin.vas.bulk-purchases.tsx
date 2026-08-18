import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas/bulk-purchases")({
  head: () => ({ meta: [{ title: "VAS Bulk Purchases — Plut Admin" }] }),
  component: () => <Outlet />,
});
