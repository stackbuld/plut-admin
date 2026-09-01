import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/ledger/corrections/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/ledger/corrections/revert", search: { ledger: "", reference: "" } });
  },
});
