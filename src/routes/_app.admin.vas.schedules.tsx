import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/vas/schedules")({
  head: () => ({ meta: [{ title: "VAS Schedules — Plut Admin" }] }),
  component: () => <Outlet />,
});
