import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/sourcing/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/sourcing/merchants" });
  },
});
