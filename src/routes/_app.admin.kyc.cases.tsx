import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/kyc/cases")({
  head: () => ({ meta: [{ title: "KYC Cases — Plut Admin" }] }),
  component: () => <Outlet />,
});
