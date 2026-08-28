import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/crypto/operations")({
  head: () => ({ meta: [{ title: "Crypto Operations — Plut Admin" }] }),
  component: () => <Outlet />,
});
