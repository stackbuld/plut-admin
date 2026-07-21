import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, ChevronDown, Coins, Gift, LayoutGrid, LogOut, Menu, Moon, Sun,
  ArrowLeftRight, Users, BookOpen, Wallet, Bitcoin, Banknote, Sparkles, MessagesSquare, Store, Smartphone, Network, ClipboardCheck, ShieldCheck, Clock, Megaphone,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tradeQueries, withdrawalQueries, sourcingBadgeQueries } from "@/api";

function usePendingCount() {
  const { data } = useQuery(tradeQueries.stats());
  return data?.pendingReview ?? 0;
}

function usePendingWithdrawalsCount() {
  const { data } = useQuery(withdrawalQueries.summary());
  return data?.pendingApprovalCount ?? 0;
}

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  badge?: number;
  matchPrefix?: string;
  children?: { to: string; label: string; exact?: boolean }[];
};

const CATALOG_CHILDREN: { to: string; label: string }[] = [
  { to: "/admin/giftcards/catalog/countries", label: "Countries" },
  { to: "/admin/giftcards/catalog/denominations", label: "Denominations" },
  { to: "/admin/giftcards/catalog/rates", label: "Rates" },
  { to: "/admin/giftcards/catalog/fx", label: "FX Rates" },
  { to: "/admin/giftcards/catalog/payout", label: "Payout Currencies" },
];

const WITHDRAWAL_CHILDREN: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin/wallets/withdrawals", label: "Overview", exact: true },
  { to: "/admin/wallets/withdrawals/all", label: "All Withdrawals" },
];

// Sourcing tabs — extend this list as later slices land (WhatsApp, Allocations, Review).
function useSourcingNav(): NavItem[] {
  const { data: badges } = useQuery(sourcingBadgeQueries.counts());
  return [
    { to: "/admin/sourcing/merchants", label: "Merchants", icon: Store, matchPrefix: "/admin/sourcing/merchants" },
    { to: "/admin/sourcing/allocations", label: "Allocations", icon: Network, badge: badges?.allocationsPending || undefined, matchPrefix: "/admin/sourcing/allocations" },
    { to: "/admin/sourcing/review", label: "Review Queue", icon: ClipboardCheck, badge: badges?.reviewQueue || undefined, matchPrefix: "/admin/sourcing/review" },
    { to: "/admin/sourcing/awaiting", label: "Awaiting Providers", icon: Clock, badge: badges?.awaitingProviders || undefined, matchPrefix: "/admin/sourcing/awaiting" },
    { to: "/admin/sourcing/our-numbers", label: "Our Numbers", icon: ShieldCheck, matchPrefix: "/admin/sourcing/our-numbers" },
    { to: "/admin/sourcing/whatsapp", label: "WhatsApp", icon: Smartphone, matchPrefix: "/admin/sourcing/whatsapp" },
  ];
}

function useGiftcardNav(): NavItem[] {
  const pending = usePendingCount();
  return [
    { to: "/admin/giftcards/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/admin/giftcards/trades", label: "Trades", icon: ArrowLeftRight, badge: pending || undefined, matchPrefix: "/admin/giftcards/trades" },
    { to: "/admin/giftcards/brands", label: "Cards", icon: Gift, matchPrefix: "/admin/giftcards/brands" },
    { to: "/admin/giftcards/catalog", label: "Catalog", icon: BookOpen, matchPrefix: "/admin/giftcards/catalog", children: CATALOG_CHILDREN },
    { to: "/admin/giftcards/users", label: "Users", icon: Users, matchPrefix: "/admin/giftcards/users" },
  ];
}

function useAiNav(): NavItem[] {
  return [
    { to: "/admin/ai/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/admin/ai/conversations", label: "Conversations", icon: MessagesSquare, matchPrefix: "/admin/ai/conversations" },
  ];
}

function useNotificationsNav(): NavItem[] {
  return [
    { to: "/admin/notifications/announcements", label: "Announcements", icon: Megaphone, matchPrefix: "/admin/notifications/announcements" },
  ];
}

function useWalletsNav(): NavItem[] {
  const pendingWd = usePendingWithdrawalsCount();
  return [
    {
      to: "/admin/wallets/withdrawals",
      label: "Withdrawals",
      icon: Banknote,
      badge: pendingWd || undefined,
      matchPrefix: "/admin/wallets/withdrawals",
      children: WITHDRAWAL_CHILDREN,
    },
  ];
}

type Product = { id: string; label: string; icon: typeof Coins; items?: NavItem[]; comingSoon?: boolean };

function Badge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span className={cn(
      "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
      active ? "bg-primary text-primary-foreground" : "bg-red-500 text-white",
    )}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

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
  const [expanded, setExpanded] = useState(active);

  if (item.children && item.children.length > 0) {
    const open = expanded || active;
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
          <item.icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge != null && item.badge > 0 && <Badge count={item.badge} active={active} />}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
        </button>
        {open && (
          <div className="mt-0.5 ml-6 flex flex-col gap-0.5 border-l border-border pl-2">
            {item.children.map((c) => {
              const cActive = c.exact
                ? pathname === c.to
                : pathname === c.to || pathname.startsWith(c.to + "/");
              return (
                <Link
                  key={c.to}
                  to={c.to}
                  preload="intent"
                  onClick={onNavigate}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    cActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

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
      {item.badge != null && item.badge > 0 && <Badge count={item.badge} active={active} />}
    </Link>
  );
}

function ProductSection({ product, pathname, onNavigate }: { product: Product; pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(product.id === "giftcards");
  const totalBadge = (product.items ?? []).reduce((sum, it) => sum + (it.badge ?? 0), 0);
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
          {!product.comingSoon && totalBadge > 0 && !open && <Badge count={totalBadge} />}
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
  const giftcardNav = useGiftcardNav();
  const sourcingNav = useSourcingNav();
  const walletsNav = useWalletsNav();
  const aiNav = useAiNav();
  const notificationsNav = useNotificationsNav();
  const products: Product[] = [
    { id: "giftcards", label: "Giftcards", icon: Gift, items: giftcardNav },
    { id: "sourcing", label: "Sourcing", icon: Store, items: sourcingNav },
    { id: "wallets", label: "Wallets", icon: Wallet, items: walletsNav },
    { id: "ai", label: "AI Assistant", icon: Sparkles, items: aiNav },
    { id: "notifications", label: "Notifications", icon: Bell, items: notificationsNav },
    { id: "vas", label: "VAS", icon: Wallet, comingSoon: true },
    { id: "crypto", label: "Crypto", icon: Bitcoin, comingSoon: true },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-3 overflow-y-auto pb-2">
        {products.map((p) => <ProductSection key={p.id} product={p} pathname={pathname} onNavigate={onNavigate} />)}
      </div>
      <SidebarFooter />
    </div>
  );
}

function deriveTitle(pathname: string): string {
  if (pathname.startsWith("/admin/giftcards/trades")) return "Giftcard Trades";
  if (pathname.startsWith("/admin/giftcards/brands")) return "Card Management";
  if (pathname.startsWith("/admin/giftcards/catalog")) return "Catalog";
  if (pathname.startsWith("/admin/giftcards/users")) return "User Management";
  if (pathname.startsWith("/admin/giftcards/dashboard")) return "Dashboard";
  if (pathname.startsWith("/admin/sourcing")) return "Sourcing";
  if (pathname.startsWith("/admin/wallets/withdrawals")) return "Withdrawals";
  if (pathname.startsWith("/admin/ai/conversations")) return "AI Conversations";
  if (pathname.startsWith("/admin/ai/dashboard")) return "AI Overview";
  if (pathname.startsWith("/admin/notifications")) return "Announcements";
  return "Plut Admin";
}

export function AppShell({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { session } = useAuth();
  const pendingCount = usePendingCount();
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
            {pendingCount > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pendingCount}
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