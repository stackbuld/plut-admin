import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Search, Filter, Loader2, MessagesSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aiQueries, userQueries } from "@/api";
import { relativeTime, formatDateTime, truncId, formatUsd, formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/admin/ai/conversations")({
  head: () => ({ meta: [{ title: "AI Conversations — Plut Admin" }] }),
  component: ConversationsLayout,
});

function ConversationsLayout() {
  const isDetail = useRouterState({
    select: (s) => s.location.pathname.match(/^\/admin\/ai\/conversations\/.+/) !== null,
  });
  if (isDetail) return <Outlet />;

  const [status, setStatus] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Filters change the result set → always jump back to the first page.
  const onStatus = (v: string) => { setStatus(v); setPage(1); };
  const onSearch = (v: string) => { setQuery(v); setPage(1); };

  const params = {
    page,
    pageSize: PAGE_SIZE,
    ...(status !== "All" ? { status } : {}),
    ...(query.trim() ? { search: query.trim() } : {}),
  };
  const { data, isLoading, isFetching } = useQuery({
    ...aiQueries.conversations(params),
    placeholderData: keepPreviousData, // keep the current page visible while the next loads
  });

  const items = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + items.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={onStatus}>
          <SelectTrigger className="h-9 w-[150px]"><Filter className="h-3.5 w-3.5" /> <SelectValue /></SelectTrigger>
          <SelectContent>
            {["All", "Active", "Archived"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => onSearch(e.target.value)} placeholder="Search by title" className="h-9 pl-9" />
        </div>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isLoading ? "Loading…" : `${total.toLocaleString()} conversation${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {items.map((c) => (
              <Link key={c.id} to="/admin/ai/conversations/$conversationId" params={{ conversationId: c.id }}
                className="block rounded-2xl border bg-card p-4 transition-colors active:bg-secondary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.title || "Untitled conversation"}</p>
                    <div className="mt-1"><CustomerName userId={c.userId} compact /></div>
                  </div>
                  <ConvStatusBadge status={c.status} />
                </div>
                <div className="mt-2"><ActionChips types={c.actionTypes} count={c.actionCount} /></div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" />{c.messageCount}</span>
                  <span>{relativeTime(c.lastActivityAt)}</span>
                  <span className="font-mono font-semibold text-foreground">{formatUsd(c.totalCostUsd)}</span>
                </div>
              </Link>
            ))}
            {items.length === 0 && <EmptyRow />}
          </div>

          {/* Desktop */}
          <div className="hidden md:block rounded-2xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    {["Conversation", "Customer", "Activity", "Messages", "Cost", "Last activity", "Status"].map((h) => (
                      <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="group border-b border-border last:border-0 transition-colors hover:bg-secondary/40">
                      <td className="px-6 py-3.5 max-w-[240px]">
                        <Link to="/admin/ai/conversations/$conversationId" params={{ conversationId: c.id }} className="block truncate font-medium hover:text-primary">
                          {c.title || <span className="text-muted-foreground">Untitled</span>}
                        </Link>
                        <p className="font-mono text-[11px] text-muted-foreground">{truncId(c.id)}</p>
                      </td>
                      <td className="px-6 py-3.5"><CustomerName userId={c.userId} /></td>
                      <td className="px-6 py-3.5"><ActionChips types={c.actionTypes} count={c.actionCount} /></td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <MessagesSquare className="h-3.5 w-3.5" />{c.messageCount}
                          {c.totalTokens > 0 && <span className="font-mono text-[11px]">· {formatTokens(c.totalTokens)} tok</span>}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono font-semibold">{formatUsd(c.totalCostUsd)}</td>
                      <td className="px-6 py-3.5">
                        <p className="text-sm">{relativeTime(c.lastActivityAt)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDateTime(c.lastActivityAt)}</p>
                      </td>
                      <td className="px-6 py-3.5"><ConvStatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">No conversations match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{from.toLocaleString()}–{to.toLocaleString()}</span> of{" "}
                <span className="font-medium text-foreground">{total.toLocaleString()}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Customer name/avatar (resolved from the platform user directory, cached per id) ──
function CustomerName({ userId, compact }: { userId: string; compact?: boolean }) {
  const { data } = useQuery({ ...userQueries.detail(userId), retry: false });
  const name = data?.displayName || [data?.firstName, data?.lastName].filter(Boolean).join(" ").trim();
  const initials = (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      {data?.avatarUrl ? (
        <img src={data.avatarUrl} alt={name} className={cn("rounded-full object-cover", compact ? "h-6 w-6" : "h-8 w-8")} />
      ) : (
        <div className={cn(
          "grid shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary",
          compact ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
        )}>{initials}</div>
      )}
      <div className="min-w-0">
        <UserRef userId={userId} className="block truncate text-sm font-medium hover:text-primary">
          {name || "Unknown user"}
        </UserRef>
        <p className="font-mono text-[11px] text-muted-foreground">{truncId(userId, 10)}</p>
      </div>
    </div>
  );
}

// ── Action-type chips: what the conversation actually did ──
const ACTION_LABELS: Record<string, string> = {
  SendMoney: "Transfer",
  Withdrawal: "Withdrawal",
  Airtime: "Airtime",
  Data: "Data",
  Electricity: "Electricity",
  Cable: "Cable",
  GiftcardBatchTrade: "Giftcard",
};

function ActionChips({ types, count }: { types: string[]; count: number }) {
  if (!types || types.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const shown = types.slice(0, 2);
  const extra = types.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((t) => (
        <span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
          {ACTION_LABELS[t] ?? prettify(t)}
        </span>
      ))}
      {extra > 0 && <span className="text-[11px] text-muted-foreground">+{extra}</span>}
      {count > types.length && <span className="text-[11px] text-muted-foreground">×{count}</span>}
    </div>
  );
}

function ConvStatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
      active
        ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
        : "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-green-500" : "bg-gray-400")} />
      {status}
    </span>
  );
}

function EmptyRow() {
  return (
    <div className="rounded-2xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
      No conversations match these filters.
    </div>
  );
}

function prettify(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2");
}
