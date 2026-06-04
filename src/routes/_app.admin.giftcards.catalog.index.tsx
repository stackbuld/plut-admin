import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/giftcards/catalog/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/giftcards/catalog/countries" });
  },
});