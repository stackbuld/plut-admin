import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas/employee-groups")({
  head: () => ({ meta: [{ title: "VAS Employee Groups — Plut Admin" }] }),
  component: () => <Outlet />,
});
