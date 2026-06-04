import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/giftcards/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Plut Admin" }] }),
  component: CatalogLayout,
});

function CatalogLayout() {
  return <Outlet />;
}