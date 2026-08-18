import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas/catalog")({
  head: () => ({ meta: [{ title: "VAS Catalog — Plut Admin" }] }),
  component: () => <Outlet />,
});
