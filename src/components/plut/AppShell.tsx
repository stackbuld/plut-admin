import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Globe, LayoutGrid, LogOut, Menu, Moon, RefreshCw, Sun, ArrowLeftRight, Clock, Coins, Banknote, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: LucideIcon };
const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/trades", label: "Trades", icon: ArrowLeftRight },
  { to: "/brands", label: "Brands", icon: Coins },
  { to: "/countries", label: "Countries", icon: Globe },
  { to: "/denominations", label: "Denominations", icon: Banknote },
  { to: "/rates", label: "Rates", icon: RefreshCw },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">P</div>
      <span className="font-display text-xl font-bold tracking-tight">Plut</span>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(item => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
            <item.icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-border p-4">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">RA</div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold">Rufai Ahmed</p>
        <p className="truncate text-xs text-muted-foreground">Super Admin</p>
      </div>
      <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <SidebarNav pathname={pathname} onNavigate={onNavigate} />
      <SidebarFooter />
    </>
  );
}

const TITLES: Record<string, string> = {
  "/": "Overview", "/trades": "Trades", "/brands": "Brands",
  "/countries": "Countries", "/denominations": "Denominations", "/rates": "Rates",
};

export function AppShell() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = TITLES[pathname] ?? "Plut";

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
            <SheetContent side="left" className="w-64 bg-sidebar p-0 flex flex-col">
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
            <span className="absolute right-1 top-1 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">RA</div>
        </div>
      </header>

      <main className="md:pl-60 pt-16">
        <div className="px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
