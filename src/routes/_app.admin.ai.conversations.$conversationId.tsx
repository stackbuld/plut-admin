import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessagesSquare, Zap, Coins, Bot, User as UserIcon, Wrench, ChevronRight } from "lucide-react";
import { UserRef } from "@/components/plut/UserSummaryModal";
import { aiQueries } from "@/api";
import type { AiMessage, AiAction } from "@/api/types";
import { formatDateTime, formatTime, formatUsd, formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/ai/conversations/$conversationId")({
  head: () => ({ meta: [{ title: "Conversation — Plut Admin" }] }),
  component: ConversationDetailPage,
});

function ConversationDetailPage() {
  const { conversationId } = useParams({ from: "/_app/admin/ai/conversations/$conversationId" });
  const { data: convo, isLoading, isError } = useQuery(aiQueries.conversation(conversationId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !convo) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Conversation not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        <span className="font-mono text-xs text-muted-foreground">{convo.id}</span>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">{convo.title || "Untitled conversation"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <UserRef userId={convo.userId} className="font-mono hover:text-foreground">{convo.userId}</UserRef>
        </p>
      </div>

      {/* ── Cost breakdown + meta ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Cost" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total cost" value={formatUsd(convo.cost.totalUsd)} accent />
            <Metric label="Chat" value={formatUsd(convo.cost.chatUsd)} sub={`${convo.cost.chatCalls} call${convo.cost.chatCalls === 1 ? "" : "s"}`} />
            <Metric label="Image analysis" value={formatUsd(convo.cost.imageAnalysisUsd)} sub={`${convo.cost.imageAnalysisCalls} call${convo.cost.imageAnalysisCalls === 1 ? "" : "s"}`} />
            <Metric label="Tokens" value={formatTokens(convo.cost.totalTokens)} />
          </div>
        </Panel>
        <Panel title="Summary">
          <Row label="Status">{convo.status}</Row>
          <Row label="Messages"><span className="inline-flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" />{convo.messages.length}</span></Row>
          <Row label="Actions"><span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{convo.actions.length}</span></Row>
          <Row label="Started">{formatDateTime(convo.createdAt)}</Row>
          <Row label="Last activity">{formatDateTime(convo.lastActivityAt)}</Row>
        </Panel>
      </div>

      {/* ── Actions the user carried out ── */}
      {convo.actions.length > 0 && (
        <Panel title={`Actions carried (${convo.actions.length})`}>
          <div className="space-y-2">
            {convo.actions.map((a) => <ActionRow key={a.id} action={a} />)}
          </div>
        </Panel>
      )}

      {/* ── Message thread ── */}
      <Panel title="Conversation">
        {convo.messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No messages.</p>
        ) : (
          <div className="space-y-4">
            {convo.messages.map((m) => <MessageBubble key={m.id} message={m} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/admin/ai/conversations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back to Conversations
    </Link>
  );
}

// ── Message thread ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: AiMessage }) {
  const role = message.role.toLowerCase();
  const isUser = role === "user";
  const isTool = role === "tool";
  const attachments = safeParse<{ type: string; url: string }[]>(message.attachmentsJson) ?? [];
  const images = attachments.filter((a) => a.type?.toLowerCase() === "image");

  if (isTool) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wrench className="h-3.5 w-3.5" />
        <span className="italic">Tool step</span>
        <span className="truncate font-mono">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full",
        isUser ? "bg-primary/12 text-primary" : "bg-secondary text-foreground",
      )}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("max-w-[80%] space-y-2", isUser && "items-end text-right")}>
        <div className={cn(
          "inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-left",
          isUser ? "bg-primary/10" : "border bg-card",
        )}>
          {message.content || <span className="text-muted-foreground italic">(no text)</span>}
        </div>
        {images.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", isUser && "justify-end")}>
            {images.map((img, i) => (
              <a key={i} href={img.url} target="_blank" rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-lg border bg-secondary/40">
                <img src={img.url} alt={`Attachment ${i + 1}`} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
        <div className={cn("flex items-center gap-2 text-[11px] text-muted-foreground", isUser && "justify-end")}>
          <span>{formatTime(message.createdAt)}</span>
          {message.totalTokens != null && message.totalTokens > 0 && (
            <span className="font-mono">· {formatTokens(message.totalTokens)} tok</span>
          )}
          {message.costUsd != null && (
            <span className="font-mono">· {formatUsd(message.costUsd)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Actions ────────────────────────────────────────────────────────────────────

function ActionRow({ action }: { action: AiAction }) {
  const summary = safeParse<{ title?: string; lines?: { label: string; value: string }[] }>(action.summaryJson);
  const title = summary?.title ?? action.type;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{prettyType(action.type)}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ActionStatusBadge status={action.status} />
      </div>
      {summary?.lines && summary.lines.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {summary.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{l.label}</span>
              <span className="text-right font-medium">{l.value}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">{formatDateTime(action.createdAt)}</p>
    </div>
  );
}

const ACTION_STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  proposed: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300",
  discarded: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

function ActionStatusBadge({ status }: { status: string }) {
  const cls = ACTION_STATUS_STYLES[status.toLowerCase()] ?? "bg-secondary text-secondary-foreground";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>{status}</span>;
}

// ── Shared bits ────────────────────────────────────────────────────────────────

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5", className)}>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-lg font-bold", accent && "text-primary")}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function prettyType(type: string): string {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function safeParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
