import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, ChevronDown, Coins, Gift, LayoutGrid, LogOut, Menu, Moon, Sun,
  ArrowLeftRight, Users, BookOpen, Wallet, Bitcoin,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { pendingTradesCount } from "@/data/mock";

type NavItem = { to: string; label: string; icon: typeof LayoutGrid; badge?: number; matchPrefix?: string };

const GIFTCARD_NAV: NavItem[] = [
  { to: "/admin/giftcards/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/admin/giftcards/trades", label: "Trades", icon: ArrowLeftRight, badge: pendingTradesCount, matchPrefix: "/admin/giftcards/trades" },
  { to: "/admin/giftcards/brands", label: "Brands", icon: Gift, matchPrefix: "/admin/giftcards/brands" },
  { to: "/admin/giftcards/catalog", label: "Catalog", icon: BookOpen },
  { to: "/admin/giftcards/users", label: "Users", icon: Users, matchPrefix: "/admin/giftcards/users" },
];

type Product = { id: string; label: string; icon: typeof Coins; items?: NavItem[]; comingSoon?: boolean };
const PRODUCTS: Product[] = [
  { id: "giftcards", label: "Giftcards", icon: Gift, items: GIFTCARD_NAV },
  { id: "vas", label: "VAS", icon: Wallet, comingSoon: true },
  { id: "crypto", label: "Crypto", icon: Bitcoin, comingSoon: true },
];

function Logo() {
  return (
    <Link to="/admin/giftcards/dashboard" className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">P</div>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-base font-bold tracking-tight">Plut</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Console</span>
      </div>
    </Link>
  );
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.to;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
      <item.icon className="h-4 w-4" />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className={cn(
          "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
          active ? "bg-primary text-primary-foreground" : "bg-red-500 text-white",
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function ProductSection({ product, pathname, onNavigate }: { product: Product; pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(product.id === "giftcards");
  return (
    <div>
      <button
        type="button"
        onClick={() => !product.comingSoon && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors",
          product.comingSoon ? "cursor-not-allowed text-muted-foreground/60" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-2">
          <product.icon className="h-3.5 w-3.5" />
          {product.label}
          {product.comingSoon && (
            <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold normal-case text-muted-foreground">Soon</span>
          )}
        </span>
        {!product.comingSoon && <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />}
      </button>
      {open && product.items && (
        <div className="mt-1 flex flex-col gap-0.5">
          {product.items.map((it) => <NavLink key={it.to} item={it} pathname={pathname} onNavigate={onNavigate} />)}
        </div>
      )}
    </div>
  );
}

function SidebarFooter() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (session?.name ?? "AD").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-border p-4">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold">{session?.name ?? "Admin"}</p>
        <p className="truncate text-xs text-muted-foreground">{session?.role ?? "Super Admin"}</p>
      </div>
      <button
        onClick={() => { signOut(); navigate({ to: "/login" }); }}
        title="Sign out"
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-3 overflow-y-auto pb-2">
        {PRODUCTS.map((p) => <ProductSection key={p.id} product={p} pathname={pathname} onNavigate={onNavigate} />)}
      </div>
      <SidebarFooter />
    </div>
  );
}

function deriveTitle(pathname: string): string {
  if (pathname.startsWith("/admin/giftcards/trades")) return "Giftcard Trades";
  if (pathname.startsWith("/admin/giftcards/brands")) return "Brand Management";
  if (pathname.startsWith("/admin/giftcards/catalog")) return "Catalog";
  if (pathname.startsWith("/admin/giftcards/users")) return "User Management";
  if (pathname.startsWith("/admin/giftcards/dashboard")) return "Dashboard";
  return "Plut Admin";
}

export function AppShell({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = deriveTitle(pathname);
  const initials = (session?.name ?? "AD").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar md:flex">
        <SidebarBody pathname={pathname} />
      </aside>

      <header className="fixed top-0 right-0 left-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:left-60 md:px-8">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="grid h-9 w-9 place-items-center rounded-md hover:bg-secondary md:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
              <SidebarBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="font-display text-xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Bell className="h-4 w-4" />
            {pendingTradesCount > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pendingTradesCount}
              </span>
            )}
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">{initials}</div>
        </div>
      </header>

      <main className="md:pl-60 pt-16">
        <div className="px-4 py-6 md:px-8">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}