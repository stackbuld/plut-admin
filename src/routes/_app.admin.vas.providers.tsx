import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas/providers")({
  head: () => ({ meta: [{ title: "VAS Providers — Plut Admin" }] }),
  component: () => <Outlet />,
});
