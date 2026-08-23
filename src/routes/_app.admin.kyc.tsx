import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/kyc")({
  head: () => ({ meta: [{ title: "KYC — Plut Admin" }] }),
  component: () => <Outlet />,
});
