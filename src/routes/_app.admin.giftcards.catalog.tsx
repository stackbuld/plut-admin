import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/giftcards/catalog")({
  head: () => ({ meta: [{ title: "Catalog — Plut Admin" }] }),
  component: CatalogLayout,
});

const TABS = [
  { to: "/admin/giftcards/catalog/countries", label: "Countries" },
  { to: "/admin/giftcards/catalog/denominations", label: "Denominations" },
  { to: "/admin/giftcards/catalog/rates", label: "Rates" },
  { to: "/admin/giftcards/catalog/fx", label: "FX Rates" },
  { to: "/admin/giftcards/catalog/payout", label: "Payout Currencies" },
] as const;

function CatalogLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-5">
      <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-secondary p-1 overflow-x-auto whitespace-nowrap max-w-full">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              preload="intent"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}