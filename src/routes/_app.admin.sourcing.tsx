import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/sourcing")({
  head: () => ({ meta: [{ title: "Sourcing — Plut Admin" }] }),
  component: SourcingLayout,
});

function SourcingLayout() {
  return <Outlet />;
}
