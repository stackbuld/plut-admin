
# Plut Admin — Build Plan

A premium fintech back-office dashboard. Vercel/Linear feel, not generic CRUD. Six fully-designed pages with mock data, dark-default theme toggle, fixed sidebar layout.

## Design System (src/styles.css)

- Replace tokens with the exact HSL palette provided (light + dark blocks).
- Add semantic tokens: `--success`, `--warning`, plus `--shadow-primary` (`0 4px 24px hsl(256 100% 75% / 0.08)`).
- Radii: `--radius: 1rem` (cards), inputs/buttons/badges use `rounded-lg` (0.5rem).
- Fonts: load Inter + Sora via Google Fonts in `__root.tsx` head; expose `font-display` (Sora) class. Set Inter as body default.
- All components consume tokens — no raw colors.

## Theme Toggle

- `src/components/theme-provider.tsx` — context + `localStorage("plut-theme")`, defaults to `"dark"`. Toggles `.dark` class on `<html>`. SSR-safe (read in `useEffect`, render after mount to avoid hydration flash).
- `ThemeToggle` button (Sun/Moon) in top bar.

## Layout (src/routes/__root.tsx)

Wrap app in `ThemeProvider` + `QueryClientProvider`. Render shared `<AppShell>` containing:

```text
+-----------------------------------------------+
|  Sidebar 240px  |  TopBar 64px               |
|  (fixed)        |-----------------------------|
|                 |  <Outlet /> px-8 py-6      |
+-----------------------------------------------+
```

- `AppSidebar`: logo (36×36 primary square + "Plut" Sora bold), nav links with Lucide icons (Overview/Trades/Brands/Countries/Denominations/Rates), active state = 12% primary bg + primary text + 3px left border. Bottom: avatar + "Rufai Ahmed" / "Super Admin" + logout icon.
- `TopBar`: page title (derived from current route via `useRouterState`), theme toggle, Bell with "2" badge, avatar.
- Mobile (<768px): sidebar becomes a Sheet behind a hamburger button in the top bar.

## Routes (src/routes/)

Each is its own file with `head()` metadata and a real H1.

1. `index.tsx` — **Overview**: 4 stat cards (Total/Pending Trades, Active Brands, Countries) with Sora 32px numbers and trend chips. Below: 60/40 grid — Recent Trades table (8 rows) + Top Brands by Volume numbered list (5 rows).
2. `trades.tsx` — **Trades**: search + Status Select + Date Range filter + Export CSV (outline). Table with 12 mock rows. Pagination footer. Row click opens `TradeDetailSheet` (shadcn Sheet, 480px) with summary, line items, optional rejection block, vertical status timeline.
3. `brands.tsx` — **Brands**: "Add Brand" primary CTA + search. 4-col responsive grid (→ 2 on tablet) of 12 brand cards (Apple, Steam, Amazon, Google Play, iTunes, Netflix, Visa, eBay, Sephora, Nike, PlayStation, Xbox). Each card: logo placeholder, name (Sora), country count, Active/Inactive badge, dropdown menu. Click → Dialog with country + denomination breakdown table.
4. `countries.tsx` — **Countries**: table with 12 rows (flag emoji, name, currency, denom count, Switch, edit icon). "Add Country" CTA.
5. `denominations.tsx` — **Denominations**: Brand + Country Select filters + search. 15-row table with amount, brand, country, card-type badge (Physical secondary / E-Code primary-tinted), FX rate, NGN payout, Switch, edit.
6. `rates.tsx` — **Rates**: table with brand, country, card type, denomination, FX rate, NGN payout, "Last Updated" relative time. Rows updated <10min get a 3px primary-tinted left border. "Sync Rates" outline button (RefreshCw) with loading spinner state.

## Mock Data

- `src/data/mock.ts` — exports `trades`, `brands`, `countries`, `denominations`, `rates` arrays with the realistic samples specified (TRD-00291 style IDs, ₦ amounts, statuses, timestamps).
- All currency formatting via a `formatNaira` / `formatCurrency` helper in `src/lib/format.ts`.

## Reusable Components (src/components/)

- `StatCard`, `StatusBadge` (maps status → color token), `BrandCard`, `TradeDetailSheet`, `PageHeader`, `DataTableShell` (header styling + hover row), `RelativeTime`.

## Shadcn Tweaks

- Use existing `button.tsx`, `badge.tsx`, `table.tsx`, `sheet.tsx`, `dialog.tsx`, `switch.tsx`, `input.tsx`, `select.tsx`, `dropdown-menu.tsx`, `avatar.tsx`. Override badge variants in-place to use 12% bg + solid text per spec.

## Technical Notes

- No backend — pure mock data, no Cloud needed.
- Use `Link` from `@tanstack/react-router`; navigation type-safe via generated route tree.
- `useRouterState` for active sidebar link + dynamic top-bar title.
- Scrollbar: main content scrolls; sidebar + topbar fixed.
- Tablet breakpoint: `md:` (768px). Sidebar uses Sheet on `<md`.

## Out of Scope

- Real auth, real APIs, persistence beyond theme preference.
- Charts (none of the 6 pages strictly need one — Recharts only added if requested).

Ready to build on approval.
