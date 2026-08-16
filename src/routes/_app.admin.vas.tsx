import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas")({
  head: () => ({ meta: [{ title: "VAS — Plut Admin" }] }),
  component: () => <Outlet />,
});
