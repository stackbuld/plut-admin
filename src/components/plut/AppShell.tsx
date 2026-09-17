import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  Coins,
  Gift,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Sun,
  ArrowLeftRight,
  Users,
  BookOpen,
  Wallet,
  Bitcoin,
  Banknote,
  Sparkles,
  MessagesSquare,
  Store,
  Smartphone,
  Network,
  ClipboardCheck,
  ShieldCheck,
  Landmark,
  Clock,
  AlertTriangle,
  Activity,
  Megaphone,
  Radio,
  IdCard,
  Library,
  Wrench,
  TrendingUp,
  CalendarCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  tradeQueries,
  withdrawalQueries,
  sourcingBadgeQueries,
  vasQueries,
  kycQueries,
  cryptoDepositQueries,
} from "@/api";
import { cryptoWithdrawalQueries } from "@/api/crypto-withdrawals";
import { cryptoOperationQueries } from "@/api/crypto-operations";

// No dedicated summary/count endpoint exists for crypto sub-accounts specifically (unlike
// withdrawals' /summary, VAS's /dashboard, or KYC's /stats) — that nav item ships without a badge.
// The other crypto nav items below now have real badge sources: crypto withdrawals' own
// pendingOnly=true list, Operations' failedCount() (a pageSize=1 call added specifically for this),
// and Deposits' unresolved-only default list.

function useCryptoPendingWithdrawalsCount() {
  const { data } = useQuery(cryptoWithdrawalQueries.list({ pendingOnly: true }));
  return data?.length ?? 0;
}

function useCryptoFailedOperationsCount() {
  const { data } = useQuery(cryptoOperationQueries.failedCount());
  return data?.totalCount ?? 0;
}

function useCryptoUnmatchedDepositsCount() {
  const { data } = useQuery(cryptoDepositQueries.unmatchedList());
  return data?.length ?? 0;
}

function usePendingCount() {
  const { data } = useQuery(tradeQueries.stats());
  return data?.pendingReview ?? 0;
}

function usePendingWithdrawalsCount() {
  const { data } = useQuery(withdrawalQueries.summary());
  return data?.pendingApprovalCount ?? 0;
}

function useVasFailedCount() {
  const { data } = useQuery(vasQueries.dashboard());
  return data?.failedLast24h ?? 0;
}

function useKycUnsyncedCount() {
  const { data } = useQuery(kycQueries.stats());
  return data?.syncHealth.approvedCasesMissingPersonalInfo ?? 0;
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
    {
      to: "/admin/sourcing/merchants",
      label: "Merchants",
      icon: Store,
      matchPrefix: "/admin/sourcing/merchants",
    },
    {
      to: "/admin/sourcing/allocations",
      label: "Allocations",
      icon: Network,
      badge: badges?.allocationsPending || undefined,
      matchPrefix: "/admin/sourcing/allocations",
    },
    {
      to: "/admin/sourcing/review",
      label: "Review Queue",
      icon: ClipboardCheck,
      badge: badges?.reviewQueue || undefined,
      matchPrefix: "/admin/sourcing/review",
    },
    {
      to: "/admin/sourcing/awaiting",
      label: "Awaiting Providers",
      icon: Clock,
      badge: badges?.awaitingProviders || undefined,
      matchPrefix: "/admin/sourcing/awaiting",
    },
    {
      to: "/admin/sourcing/our-numbers",
      label: "Our Numbers",
      icon: ShieldCheck,
      matchPrefix: "/admin/sourcing/our-numbers",
    },
    {
      to: "/admin/sourcing/whatsapp",
      label: "WhatsApp",
      icon: Smartphone,
      matchPrefix: "/admin/sourcing/whatsapp",
    },
  ];
}

function useGiftcardNav(): NavItem[] {
  const pending = usePendingCount();
  return [
    { to: "/admin/giftcards/dashboard", label: "Dashboard", icon: LayoutGrid },
    {
      to: "/admin/giftcards/trades",
      label: "Trades",
      icon: ArrowLeftRight,
      badge: pending || undefined,
      matchPrefix: "/admin/giftcards/trades",
    },
    {
      to: "/admin/giftcards/brands",
      label: "Cards",
      icon: Gift,
      matchPrefix: "/admin/giftcards/brands",
    },
    {
      to: "/admin/giftcards/catalog",
      label: "Catalog",
      icon: BookOpen,
      matchPrefix: "/admin/giftcards/catalog",
      children: CATALOG_CHILDREN,
    },
    {
      to: "/admin/giftcards/users",
      label: "Users",
      icon: Users,
      matchPrefix: "/admin/giftcards/users",
    },
  ];
}

function useAccountsNav(): NavItem[] {
  return [
    { to: "/admin/users/dashboard", label: "Dashboard", icon: LayoutGrid },
    { to: "/admin/users", label: "Directory", icon: Users },
  ];
}

function useAiNav(): NavItem[] {
  return [
    { to: "/admin/ai/dashboard", label: "Dashboard", icon: LayoutGrid },
    {
      to: "/admin/ai/conversations",
      label: "Conversations",
      icon: MessagesSquare,
      matchPrefix: "/admin/ai/conversations",
    },
  ];
}

function useNotificationsNav(): NavItem[] {
  return [
    {
      to: "/admin/notifications/announcements",
      label: "Announcements",
      icon: Megaphone,
      matchPrefix: "/admin/notifications/announcements",
    },
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
    {
      to: "/admin/wallets/adjustments",
      label: "Adjustments",
      icon: SlidersHorizontal,
      matchPrefix: "/admin/wallets/adjustments",
    },
  ];
}

function useVasNav(): NavItem[] {
  const failedCount = useVasFailedCount();
  return [
    { to: "/admin/vas/dashboard", label: "Dashboard", icon: LayoutGrid },
    {
      to: "/admin/vas/transactions",
      label: "Transactions",
      icon: ArrowLeftRight,
      badge: failedCount || undefined,
      matchPrefix: "/admin/vas/transactions",
    },
    {
      to: "/admin/vas/providers",
      label: "Providers",
      icon: Radio,
      matchPrefix: "/admin/vas/providers",
    },
    {
      to: "/admin/vas/catalog",
      label: "Catalog",
      icon: BookOpen,
      matchPrefix: "/admin/vas/catalog",
    },
    {
      to: "/admin/vas/commissions",
      label: "Commissions",
      icon: Coins,
      matchPrefix: "/admin/vas/commissions",
    },
    {
      to: "/admin/vas/bulk-purchases",
      label: "Bulk Purchases",
      icon: ClipboardCheck,
      matchPrefix: "/admin/vas/bulk-purchases",
    },
    {
      to: "/admin/vas/employee-groups",
      label: "Employee Groups",
      icon: Users,
      matchPrefix: "/admin/vas/employee-groups",
    },
    {
      to: "/admin/vas/schedules",
      label: "Schedules",
      icon: Clock,
      matchPrefix: "/admin/vas/schedules",
    },
    {
      to: "/admin/vas/security",
      label: "Fraud & Security",
      icon: ShieldCheck,
      matchPrefix: "/admin/vas/security",
    },
  ];
}

const CRYPTO_PRICING_CHILDREN: { to: string; label: string }[] = [
  { to: "/admin/crypto/pricing/fees", label: "Fees & Spread" },
  { to: "/admin/crypto/pricing/fx-rates", label: "FX Rates" },
];

function useCryptoNav(): NavItem[] {
  const pendingWd = useCryptoPendingWithdrawalsCount();
  const failedOps = useCryptoFailedOperationsCount();
  const unmatchedDeposits = useCryptoUnmatchedDepositsCount();
  return [
    { to: "/admin/crypto/dashboard", label: "Dashboard", icon: LayoutGrid },
    {
      to: "/admin/crypto/subaccounts",
      label: "Sub-Accounts",
      icon: Bitcoin,
      matchPrefix: "/admin/crypto/subaccounts",
    },
    {
      to: "/admin/crypto/wallets",
      label: "Wallets & Users",
      icon: Users,
      matchPrefix: "/admin/crypto/wallets",
    },
    {
      to: "/admin/crypto/deposits",
      label: "Deposits",
      icon: Banknote,
      badge: unmatchedDeposits || undefined,
      matchPrefix: "/admin/crypto/deposits",
    },
    {
      to: "/admin/crypto/withdrawals",
      label: "Withdrawals",
      icon: ArrowLeftRight,
      badge: pendingWd || undefined,
      matchPrefix: "/admin/crypto/withdrawals",
    },
    {
      to: "/admin/crypto/transactions",
      label: "Transactions",
      icon: Clock,
      matchPrefix: "/admin/crypto/transactions",
    },
    {
      to: "/admin/crypto/pricing",
      label: "Pricing",
      icon: Coins,
      matchPrefix: "/admin/crypto/pricing",
      children: CRYPTO_PRICING_CHILDREN,
    },
    {
      to: "/admin/crypto/assets",
      label: "Assets & Networks",
      icon: Network,
      matchPrefix: "/admin/crypto/assets",
    },
    {
      to: "/admin/crypto/operations",
      label: "Operations",
      icon: Activity,
      badge: failedOps || undefined,
      matchPrefix: "/admin/crypto/operations",
    },
    {
      to: "/admin/crypto/treasury",
      label: "Treasury",
      icon: ShieldCheck,
      matchPrefix: "/admin/crypto/treasury",
    },
    {
      to: "/admin/crypto/liquidation",
      label: "Liquidation",
      icon: Landmark,
      matchPrefix: "/admin/crypto/liquidation",
    },
    {
      to: "/admin/crypto/revenue",
      label: "Revenue",
      icon: Sparkles,
      matchPrefix: "/admin/crypto/revenue",
    },
    {
      to: "/admin/crypto/system-health",
      label: "System Health",
      icon: Radio,
      matchPrefix: "/admin/crypto/system-health",
    },
  ];
}

// docs/ledger-service-docs/admin-console/00-OVERVIEW.md — ledger-service's first-ever admin
// surface. Only "Ledgers & Accounts" exists so far (§4 build order builds this first since
// everything else depends on it) — deliberately not pre-adding nav entries for unbuilt screens,
// same principle the crypto console's own plan states for Risk & Compliance.
function useLedgerNav(): NavItem[] {
  return [
    {
      to: "/admin/ledger",
      label: "Dashboard",
      icon: LayoutGrid,
    },
    {
      to: "/admin/ledger/accounts",
      label: "Ledgers & Accounts",
      icon: Library,
      matchPrefix: "/admin/ledger/accounts",
    },
    {
      to: "/admin/ledger/float",
      label: "Operational Accounts",
      icon: AlertTriangle,
      matchPrefix: "/admin/ledger/float",
    },
    {
      to: "/admin/ledger/transactions",
      label: "Transactions",
      icon: Clock,
      matchPrefix: "/admin/ledger/transactions",
    },
    {
      to: "/admin/ledger/corrections",
      label: "Corrections",
      icon: Wrench,
      matchPrefix: "/admin/ledger/corrections",
    },
    {
      to: "/admin/ledger/revenue",
      label: "Revenue & P&L",
      icon: TrendingUp,
      matchPrefix: "/admin/ledger/revenue",
    },
    {
      to: "/admin/ledger/trial-balance",
      label: "Trial Balance",
      icon: ClipboardCheck,
      matchPrefix: "/admin/ledger/trial-balance",
    },
    {
      to: "/admin/ledger/reconciliation",
      label: "Reconciliation",
      icon: ShieldCheck,
      matchPrefix: "/admin/ledger/reconciliation",
    },
    {
      to: "/admin/ledger/health",
      label: "System Health",
      icon: Radio,
      matchPrefix: "/admin/ledger/health",
    },
    {
      to: "/admin/ledger/period-close",
      label: "Period Close",
      icon: CalendarCheck,
      matchPrefix: "/admin/ledger/period-close",
    },
  ];
}

function useKycNav(): NavItem[] {
  const unsyncedCount = useKycUnsyncedCount();
  return [
    { to: "/admin/kyc/dashboard", label: "Dashboard", icon: LayoutGrid },
    {
      to: "/admin/kyc/cases",
      label: "Cases",
      icon: ArrowLeftRight,
      badge: unsyncedCount || undefined,
      matchPrefix: "/admin/kyc/cases",
    },
  ];
}

const OBSERVABILITY_NAV: NavItem[] = [
  {
    to: "/admin/observability/critical-errors",
    label: "Critical Errors",
    icon: AlertTriangle,
    matchPrefix: "/admin/observability/critical-errors",
  },
];

type Product = {
  id: string;
  label: string;
  icon: typeof Coins;
  items?: NavItem[];
  comingSoon?: boolean;
};

function Badge({ count, active }: { count: number; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
        active ? "bg-primary text-primary-foreground" : "bg-red-500 text-white",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Logo() {
  return (
    <Link to="/admin/giftcards/dashboard" className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">
        P
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-base font-bold tracking-tight">Plut</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Admin Console
        </span>
      </div>
    </Link>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
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
            active
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {active && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
          )}
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
                    cActive
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
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
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}
      <item.icon className="h-4 w-4" />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && <Badge count={item.badge} active={active} />}
    </Link>
  );
}

function ProductSection({
  product,
  pathname,
  onNavigate,
}: {
  product: Product;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(product.id === "giftcards");
  const totalBadge = (product.items ?? []).reduce((sum, it) => sum + (it.badge ?? 0), 0);
  return (
    <div>
      <button
        type="button"
        onClick={() => !product.comingSoon && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors",
          product.comingSoon
            ? "cursor-not-allowed text-muted-foreground/60"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-2">
          <product.icon className="h-3.5 w-3.5" />
          {product.label}
          {product.comingSoon && (
            <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-semibold normal-case text-muted-foreground">
              Soon
            </span>
          )}
          {!product.comingSoon && totalBadge > 0 && !open && <Badge count={totalBadge} />}
        </span>
        {!product.comingSoon && (
          <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        )}
      </button>
      {open && product.items && (
        <div className="mt-1 flex flex-col gap-0.5">
          {product.items.map((it) => (
            <NavLink key={it.to} item={it} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarFooter() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (session?.name ?? "AD")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="mt-auto flex items-center gap-3 border-t border-border p-4">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold">{session?.name ?? "Admin"}</p>
        <p className="truncate text-xs text-muted-foreground">{session?.role ?? "Super Admin"}</p>
      </div>
      <button
        onClick={() => {
          signOut();
          navigate({ to: "/login" });
        }}
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
  const vasNav = useVasNav();
  const kycNav = useKycNav();
  const accountsNav = useAccountsNav();
  const cryptoNav = useCryptoNav();
  const ledgerNav = useLedgerNav();
  const products: Product[] = [
    { id: "giftcards", label: "Giftcards", icon: Gift, items: giftcardNav },
    { id: "accounts", label: "Users", icon: Users, items: accountsNav },
    { id: "sourcing", label: "Sourcing", icon: Store, items: sourcingNav },
    { id: "wallets", label: "Wallets", icon: Wallet, items: walletsNav },
    { id: "vas", label: "VAS", icon: Smartphone, items: vasNav },
    { id: "kyc", label: "KYC", icon: IdCard, items: kycNav },
    { id: "crypto", label: "Crypto", icon: Bitcoin, items: cryptoNav },
    { id: "ledger", label: "Ledger", icon: Library, items: ledgerNav },
    { id: "ai", label: "AI Assistant", icon: Sparkles, items: aiNav },
    { id: "observability", label: "Observability", icon: Activity, items: OBSERVABILITY_NAV },
    { id: "notifications", label: "Notifications", icon: Bell, items: notificationsNav },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-3 overflow-y-auto pb-2">
        {products.map((p) => (
          <ProductSection key={p.id} product={p} pathname={pathname} onNavigate={onNavigate} />
        ))}
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
  if (pathname.startsWith("/admin/wallets/adjustments")) return "Wallet Adjustments";
  if (pathname.startsWith("/admin/ai/conversations")) return "AI Conversations";
  if (pathname.startsWith("/admin/ai/dashboard")) return "AI Overview";
  if (pathname.startsWith("/admin/observability/critical-errors")) return "Critical Errors";
  if (pathname.startsWith("/admin/notifications")) return "Announcements";
  if (pathname.startsWith("/admin/vas/dashboard")) return "VAS Overview";
  if (pathname.startsWith("/admin/vas/transactions")) return "VAS Transactions";
  if (pathname.startsWith("/admin/vas/providers")) return "VAS Providers";
  if (pathname.startsWith("/admin/vas/catalog")) return "VAS Catalog";
  if (pathname.startsWith("/admin/vas/commissions")) return "VAS Commissions";
  if (pathname.startsWith("/admin/vas/bulk-purchases")) return "VAS Bulk Purchases";
  if (pathname.startsWith("/admin/vas/employee-groups")) return "VAS Employee Groups";
  if (pathname.startsWith("/admin/vas/schedules")) return "VAS Schedules";
  if (pathname.startsWith("/admin/vas/security")) return "VAS Fraud & Security";
  if (pathname.startsWith("/admin/kyc/dashboard")) return "KYC Overview";
  if (pathname.startsWith("/admin/kyc/cases")) return "KYC Cases";
  if (pathname.startsWith("/admin/users/dashboard")) return "User Growth";
  if (pathname.startsWith("/admin/users")) return "All Users";
  if (pathname.startsWith("/admin/crypto/dashboard")) return "Crypto Dashboard";
  if (pathname.startsWith("/admin/crypto/subaccounts")) return "Crypto Sub-Accounts";
  if (pathname.startsWith("/admin/crypto/wallets")) return "Crypto Wallets & Users";
  if (pathname.startsWith("/admin/crypto/deposits")) return "Crypto Deposits";
  if (pathname.startsWith("/admin/crypto/withdrawals")) return "Crypto Withdrawals";
  if (pathname.startsWith("/admin/crypto/transactions")) return "Crypto Transactions";
  if (pathname.startsWith("/admin/crypto/pricing/fees")) return "Crypto Fees & Spread";
  if (pathname.startsWith("/admin/crypto/pricing/fx-rates")) return "Crypto FX Rates";
  if (pathname.startsWith("/admin/crypto/assets")) return "Crypto Assets & Networks";
  if (pathname.startsWith("/admin/crypto/operations")) return "Crypto Operations";
  if (pathname.startsWith("/admin/crypto/treasury")) return "Crypto Treasury";
  if (pathname.startsWith("/admin/crypto/liquidation")) return "Crypto Liquidation";
  if (pathname === "/admin/ledger") return "Ledger Admin";
  if (pathname.startsWith("/admin/ledger/accounts")) return "Ledgers & Accounts";
  if (pathname.startsWith("/admin/ledger/float")) return "Operational Accounts";
  if (pathname.startsWith("/admin/ledger/transactions")) return "Ledger Transactions";
  if (pathname.startsWith("/admin/ledger/corrections")) return "Corrections & Manual Postings";
  if (pathname.startsWith("/admin/ledger/revenue")) return "Ledger Revenue & P&L";
  if (pathname.startsWith("/admin/ledger/trial-balance")) return "Trial Balance";
  if (pathname.startsWith("/admin/ledger/reconciliation")) return "Manifest Reconciliation";
  if (pathname.startsWith("/admin/ledger/health")) return "System Health & Ops";
  if (pathname.startsWith("/admin/ledger/period-close")) return "Period Close";
  if (pathname.startsWith("/admin/crypto/revenue")) return "Crypto Revenue";
  if (pathname.startsWith("/admin/crypto/system-health")) return "Crypto System Health";
  return "Plut Admin";
}

export function AppShell({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { session } = useAuth();
  const pendingCount = usePendingCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = deriveTitle(pathname);
  const initials = (session?.name ?? "AD")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="font-display text-xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
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
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
        </div>
      </header>

      <main className="md:pl-60 pt-16">
        <div className="px-4 py-6 md:px-8">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}
