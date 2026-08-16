import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { relativeTime, formatDateTime, truncId } from "@/lib/format";
import { TablePager, FilterSelect } from "@/components/plut/catalog-shared";
import { StatCard } from "@/components/plut/StatCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  acknowledgeCriticalError,
  criticalErrorKeys,
  criticalErrorQueries,
} from "@/api/critical-errors";
import type {
  CriticalError,
  CriticalErrorDetail,
  CriticalErrorSeverity,
} from "@/api/types/critical-errors.types";

type SeverityFilter = CriticalErrorSeverity | "All";
type StatusFilter = "open" | "acknowledged" | "all";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SEVERITY: SeverityFilter = "All";
const DEFAULT_STATUS: StatusFilter = "open";
const DEFAULT_MODULE = "All";

// Known producers of critical errors (§8 of the API reference) — kept as a fixed list
// rather than derived from page data, so the filter is stable even when a module has
// zero errors on the current page (e.g. it's quiet right now, which is the point).
const MODULE_OPTIONS = [
  { v: "All", l: "All modules" },
  { v: "wallets", l: "Wallets" },
  { v: "account-service", l: "Account Service" },
  { v: "ledger-service", l: "Ledger Service" },
  { v: "gift-cards", l: "Gift Cards" },
  { v: "vas", l: "VAS" },
  { v: "ai-service", l: "AI Service" },
  { v: "notifications", l: "Notifications" },
  { v: "platform", l: "Platform" },
];

export const Route = createFileRoute("/_app/admin/observability/critical-errors")({
  component: CriticalErrorsPage,
});

function CriticalErrorsPage() {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState<SeverityFilter>(DEFAULT_SEVERITY);
  const [status, setStatus] = useState<StatusFilter>(DEFAULT_STATUS);
  const [module, setModule] = useState(DEFAULT_MODULE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const acknowledged = status === "all" ? undefined : status === "acknowledged";
  const filtersActive =
    severity !== DEFAULT_SEVERITY || status !== DEFAULT_STATUS || module !== DEFAULT_MODULE;

  const listParams = { severity, acknowledged, module, page, pageSize };
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery(
    criticalErrorQueries.list(listParams),
  );
  const health = useQuery(criticalErrorQueries.health());
  const openP2 = useQuery(
    criticalErrorQueries.list({ severity: "P2", acknowledged: false, page: 1, pageSize: 1 }),
  );
  const openTotal = useQuery(
    criticalErrorQueries.list({ acknowledged: false, page: 1, pageSize: 1 }),
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const selectableIds = useMemo(
    () => (data?.items ?? []).filter((e) => !e.acknowledged).map((e) => e.id),
    [data],
  );
  const allSelectedOnPage =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function resetToFirstPage() {
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelectAll() {
    setSelected(allSelectedOnPage ? new Set() : new Set(selectableIds));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const bulkAck = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => acknowledgeCriticalError(id))),
    onSuccess: (_data, ids) => {
      toast.success(`Acknowledged ${ids.length} error${ids.length === 1 ? "" : "s"}.`);
      qc.invalidateQueries({ queryKey: criticalErrorKeys.lists() });
      qc.invalidateQueries({ queryKey: criticalErrorKeys.health() });
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Critical Errors</h2>
        </div>
        <LiveIndicator
          isFetching={isFetching}
          dataUpdatedAt={dataUpdatedAt}
          onRefresh={() => {
            refetch();
            health.refetch();
            openP2.refetch();
            openTotal.refetch();
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open P1"
          value={health.data ? String(health.data.openP1Count) : "…"}
          icon={AlertTriangle}
          sublabel="critical · needs attention now"
        />
        <StatCard
          label="Open P2"
          value={openP2.data ? String(openP2.data.total) : "…"}
          icon={AlertTriangle}
          sublabel="high priority"
        />
        <StatCard
          label="Total Open"
          value={openTotal.data ? String(openTotal.data.total) : "…"}
          icon={AlertTriangle}
          sublabel="all unacknowledged"
        />
        <StatCard
          label="Pipeline"
          value={health.isLoading ? "…" : health.data?.dbReachable ? "Healthy" : "Degraded"}
          icon={health.data?.dbReachable === false ? ShieldAlert : ShieldCheck}
          sublabel={
            health.data?.lastSeenAt
              ? `last event ${relativeTime(health.data.lastSeenAt)}`
              : health.isLoading
                ? "checking…"
                : "no events recorded"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <FilterGroup<SeverityFilter>
          value={severity}
          onChange={(v) => {
            setSeverity(v);
            resetToFirstPage();
          }}
          options={[
            ["All", "All"],
            ["P1", "P1 · Critical"],
            ["P2", "P2 · High"],
          ]}
        />
        <span className="mx-1 h-4 w-px bg-border" />
        <FilterGroup<StatusFilter>
          value={status}
          onChange={(v) => {
            setStatus(v);
            resetToFirstPage();
          }}
          options={[
            ["open", "Open"],
            ["acknowledged", "Acknowledged"],
            ["all", "All"],
          ]}
        />
        <span className="mx-1 h-4 w-px bg-border" />
        <FilterSelect
          value={module}
          onChange={(v) => {
            setModule(v);
            resetToFirstPage();
          }}
          placeholder="Module"
          options={MODULE_OPTIONS.map((m) => ({ v: m.v, l: m.l }))}
        />
        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => {
              setSeverity(DEFAULT_SEVERITY);
              setStatus(DEFAULT_STATUS);
              setModule(DEFAULT_MODULE);
              resetToFirstPage();
            }}
          >
            <X className="h-3 w-3" /> Clear filters
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${total.toLocaleString()} error${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={bulkAck.isPending}
            onClick={() => bulkAck.mutate(Array.from(selected))}
          >
            {bulkAck.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Acknowledge {selected.size}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {isLoading ? (
        <LoadingRows />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          {status === "open"
            ? "✅ No open critical errors. The backend is quiet."
            : "No critical errors match the selected filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {selectableIds.length > 0 && (
            <label className="flex w-fit items-center gap-2 pl-1 text-xs text-muted-foreground">
              <Checkbox checked={allSelectedOnPage} onCheckedChange={toggleSelectAll} />
              Select all open on this page
            </label>
          )}
          {items.map((e) => (
            <ErrorRow
              key={e.id}
              error={e}
              selected={selected.has(e.id)}
              onToggleSelect={() => toggleSelect(e.id)}
              onFilterModule={() => {
                setModule(e.module);
                resetToFirstPage();
              }}
            />
          ))}
        </div>
      )}

      {!isLoading && total > 0 && (
        <TablePager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => {
            setPage(p);
            setSelected(new Set());
          }}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            resetToFirstPage();
          }}
          noun="error"
        />
      )}
    </div>
  );
}

function LiveIndicator({
  isFetching,
  dataUpdatedAt,
  onRefresh,
}: {
  isFetching: boolean;
  dataUpdatedAt: number;
  onRefresh: () => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75",
              isFetching && "animate-ping",
            )}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      {dataUpdatedAt > 0 && (
        <span>· updated {relativeTime(new Date(dataUpdatedAt).toISOString())}</span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        title="Refresh now"
        onClick={onRefresh}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
      </Button>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function FilterGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map(([val, label]) => {
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const isP1 = severity === "P1";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        isP1 ? "bg-red-500 text-white" : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      )}
    >
      {severity}
    </span>
  );
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied to clipboard`),
    () => toast.error(`Couldn't copy ${label.toLowerCase()}`),
  );
}

function buildReportText(error: CriticalError, detail?: CriticalErrorDetail): string {
  const context = detail?.context ?? {};
  const namedKeys = new Set<string>([...FAULT_KEYS, PAYLOAD_KEY, RESPONSE_BODY_KEY]);
  const rest = Object.entries(context).filter(([k]) => !namedKeys.has(k) && !k.startsWith("db."));
  const restSmall = rest.filter(([, v]) => v.length <= LARGE_VALUE_THRESHOLD);
  const restLarge = rest.filter(([, v]) => v.length > LARGE_VALUE_THRESHOLD);

  const lines: (string | null)[] = [
    `[${error.severity}] ${error.module} — ${error.message}`,
    `Operation: ${error.operation ?? "—"}${error.statusCode ? ` (HTTP ${error.statusCode})` : ""}`,
    `Environment: ${error.environment}${error.host ? ` · ${error.host}` : ""}`,
    `Occurrences: ${error.occurrenceCount} · first seen ${formatDateTime(error.firstSeenAt)} · last seen ${formatDateTime(error.lastSeenAt)}`,
    `Fingerprint: ${error.fingerprint}`,
    error.traceId ? `Trace: ${error.traceId}` : null,
    detail?.userId ? `User: ${detail.userId}` : null,
    // Location and payload are what a reader needs first, so they get their own lines rather than
    // being buried in a comma-joined context dump.
    context["exception.file"]
      ? `Failed at: ${context["exception.file"]}${
          context["exception.line"] ? `:${context["exception.line"]}` : ""
        }${context["exception.site"] ? ` (${context["exception.site"]})` : ""}`
      : null,
    context["exception.innerMessage"] ? `Root cause: ${context["exception.innerMessage"]}` : null,
    restSmall.length ? `Context: ${restSmall.map(([k, v]) => `${k}=${v}`).join(", ")}` : null,
    context[PAYLOAD_KEY]
      ? `\nRequest payload (secrets masked):\n${prettyJson(context[PAYLOAD_KEY])}`
      : null,
    context[RESPONSE_BODY_KEY]
      ? `\nResponse body (secrets masked):\n${prettyJson(context[RESPONSE_BODY_KEY])}`
      : null,
    ...restLarge.map(([k, v]) => `\n${k}:\n${prettyJson(v)}`),
    detail?.stackTrace ? `\nStack trace:\n${detail.stackTrace}` : null,
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

function ErrorRow({
  error,
  selected,
  onToggleSelect,
  onFilterModule,
}: {
  error: CriticalError;
  selected: boolean;
  onToggleSelect: () => void;
  onFilterModule: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const { data: detail, isLoading: detailLoading } = useQuery({
    ...criticalErrorQueries.detail(error.id),
    enabled: expanded,
  });

  const ack = useMutation({
    mutationFn: () => acknowledgeCriticalError(error.id),
    onSuccess: () => {
      toast.success("Error acknowledged.");
      qc.invalidateQueries({ queryKey: criticalErrorKeys.lists() });
      qc.invalidateQueries({ queryKey: criticalErrorKeys.health() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isFresh = Date.now() - new Date(error.lastSeenAt).getTime() < 5 * 60 * 1000;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors",
        error.severity === "P1" && !error.acknowledged && "border-red-500/40",
        error.acknowledged && "opacity-70",
        selected && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {!error.acknowledged && (
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              className="mt-1"
              aria-label="Select error"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={error.severity} />
              <button
                type="button"
                onClick={onFilterModule}
                title={`Filter to ${error.module}`}
                className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-foreground hover:bg-secondary/70"
              >
                {error.module}
              </button>
              {error.statusCode ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  HTTP {error.statusCode}
                </span>
              ) : null}
              {error.occurrenceCount > 1 && (
                <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                  ×{error.occurrenceCount}
                </span>
              )}
              {isFresh && !error.acknowledged && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> active
                </span>
              )}
              {error.acknowledged && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> acknowledged
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex items-start gap-1.5 text-left"
            >
              {expanded ? (
                <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground break-words">
                {error.message}
              </span>
            </button>

            <p className="mt-1 pl-5 font-mono text-[11px] text-muted-foreground break-all">
              {error.operation ?? "—"} · {error.environment}
              {error.host ? ` · ${error.host}` : ""} · {relativeTime(error.lastSeenAt)}
              {error.traceId ? ` · trace ${truncId(error.traceId, 16)}` : ""}
            </p>
          </div>
        </div>

        {!error.acknowledged && (
          <button
            type="button"
            onClick={() => ack.mutate()}
            disabled={ack.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            {ack.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Acknowledge
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading detail…
            </div>
          ) : (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                <Field
                  label="Fingerprint"
                  value={error.fingerprint}
                  mono
                  onCopy={() => copyText(error.fingerprint, "Fingerprint")}
                />
                <Field label="First seen" value={formatDateTime(error.firstSeenAt)} />
                <Field label="Last seen" value={formatDateTime(error.lastSeenAt)} />
                {error.lastForwardedAt ? (
                  <Field
                    label="Last forwarded to Discord"
                    value={formatDateTime(error.lastForwardedAt)}
                  />
                ) : (
                  <Field
                    label="Last forwarded to Discord"
                    value="never (suppressed by dedup window, or n8n unconfigured)"
                  />
                )}
                {detail?.userId ? <Field label="User" value={detail.userId} mono /> : null}
                {detail?.httpMethod ? <Field label="Method" value={detail.httpMethod} /> : null}
                {error.traceId ? (
                  <Field
                    label="Trace ID"
                    value={error.traceId}
                    mono
                    onCopy={() => copyText(error.traceId!, "Trace ID")}
                  />
                ) : null}
              </dl>

              {detail?.context && Object.keys(detail.context).length > 0 && (
                <ContextPanels context={detail.context} />
              )}

              {detail?.stackTrace ? (
                <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-[10px] leading-relaxed text-muted-foreground">
                  {detail.stackTrace}
                </pre>
              ) : (
                <p className="text-[11px] text-muted-foreground">No stack trace captured.</p>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => copyText(buildReportText(error, detail), "Report")}
              >
                <Clipboard className="h-3.5 w-3.5" /> Copy report for sharing
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Context rendering ────────────────────────────────────────────────────────
// The backend enriches every error with a flat context bag. A few keys answer the first
// questions triage always asks — where did it throw, what did the database object to, what was
// sent and received — so they get dedicated treatment instead of being truncated into a generic
// grid cell. Anything else still falls through to that grid; anything long, to its own formatted
// block (the same treatment stackTrace already gets) — so a future backend key is legible without
// a frontend change.

const FAULT_KEYS = [
  "exception.type",
  "exception.innerType",
  "exception.innerMessage",
  "exception.site",
  "exception.file",
  "exception.line",
] as const;

const PAYLOAD_KEY = "request.payload";
const RESPONSE_BODY_KEY = "response.body";
const RESPONSE_STATUS_KEY = "response.statusCode";
const ENDPOINT_KEY = "endpoint";
const LARGE_VALUE_THRESHOLD = 120;

function ContextPanels({ context }: { context: Record<string, string> }) {
  const get = (k: string) => context[k]?.trim() || undefined;

  const file = get("exception.file");
  const line = get("exception.line");
  const site = get("exception.site");
  const rootCause = get("exception.innerMessage");
  const payload = get(PAYLOAD_KEY);
  const responseBody = get(RESPONSE_BODY_KEY);
  const endpoint = get(ENDPOINT_KEY);
  const responseStatus = get(RESPONSE_STATUS_KEY);

  const dbEntries = Object.entries(context).filter(([k]) => k.startsWith("db."));
  const namedKeys = new Set<string>([...FAULT_KEYS, PAYLOAD_KEY, RESPONSE_BODY_KEY]);
  const rest = Object.entries(context).filter(([k]) => !namedKeys.has(k) && !k.startsWith("db."));
  const restSmall = rest.filter(([, v]) => v.length <= LARGE_VALUE_THRESHOLD);
  const restLarge = rest.filter(([, v]) => v.length > LARGE_VALUE_THRESHOLD);

  return (
    <div className="space-y-3">
      {(file || site || rootCause) && (
        <div className="rounded-lg border border-border bg-muted/40 p-2.5">
          <p className="mb-1 text-[11px] text-muted-foreground">Where it failed</p>
          {file && (
            <p className="font-mono text-xs font-semibold text-foreground break-all">
              {file}
              {line ? `:${line}` : ""}
            </p>
          )}
          {site && (
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground break-all">{site}</p>
          )}
          {rootCause && (
            <p className="mt-1.5 text-[11px] text-foreground break-words">
              <span className="text-muted-foreground">Root cause: </span>
              {rootCause}
            </p>
          )}
        </div>
      )}

      {dbEntries.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">Database</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-muted/40 p-2.5 text-[11px] sm:grid-cols-3">
            {dbEntries.map(([k, v]) => (
              <Field key={k} label={k.replace(/^db\./, "")} value={v} mono />
            ))}
          </dl>
        </div>
      )}

      {endpoint && (
        <p className="text-[11px] text-muted-foreground">
          Downstream call: <span className="font-mono text-foreground">{endpoint}</span>
          {responseStatus ? ` · HTTP ${responseStatus}` : ""}
        </p>
      )}

      {payload && <PayloadBlock label="Request payload" value={payload} />}
      {responseBody && <PayloadBlock label="Response body" value={responseBody} />}

      {restSmall.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">Context</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-muted/40 p-2.5 text-[11px] sm:grid-cols-3">
            {restSmall.map(([k, v]) => (
              <Field key={k} label={k} value={v} mono />
            ))}
          </dl>
        </div>
      )}

      {restLarge.map(([k, v]) => (
        <PayloadBlock key={k} label={k} value={v} mono />
      ))}
    </div>
  );
}

/** A copyable, pretty-printed block for a payload-shaped context value (request/response bodies,
 * or any other context entry too long for the generic grid). Secrets are masked at the source
 * (backend), never here — this only formats what it's given. */
function PayloadBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p
          className={
            mono
              ? "font-mono text-[11px] text-muted-foreground"
              : "text-[11px] text-muted-foreground"
          }
        >
          {label} <span className="opacity-70">(secrets masked at source)</span>
        </p>
        <button
          type="button"
          onClick={() => copyText(value, label)}
          className="text-muted-foreground hover:text-foreground"
          title={`Copy ${label.toLowerCase()}`}
        >
          <Clipboard className="h-3 w-3" />
        </button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-2.5 text-[10px] leading-relaxed text-foreground">
        {prettyJson(value)}
      </pre>
    </div>
  );
}

/** Pretty-prints a JSON payload; returns it untouched when it isn't JSON (form bodies, plain text). */
function prettyJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function Field({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("flex items-center gap-1 truncate text-foreground", mono && "font-mono")}>
        <span className="truncate">{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title={`Copy ${label.toLowerCase()}`}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Clipboard className="h-3 w-3" />
          </button>
        )}
      </dd>
    </div>
  );
}
