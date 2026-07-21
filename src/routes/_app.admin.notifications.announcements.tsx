import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { broadcastNotification } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/notifications/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Plut Admin" }] }),
  component: AnnouncementsPage,
});

const TITLE_LIMIT = 65;
const BODY_LIMIT = 180;

function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: () =>
      broadcastNotification({
        workflowId: "announcement",
        subscriberIds: null,
        payload: { title: title.trim(), body: body.trim() },
        toAllBatches: true,
      }),
    onSuccess: () => {
      toast.success("Announcement sent to all users");
      setTitle("");
      setBody("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send announcement"),
  });

  const ready = title.trim().length > 0 && body.trim().length > 0 && !send.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Send an announcement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Delivers a push notification and an inbox message to every Plut user. There is no undo, so preview carefully before sending.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="ann-title">Title</Label>
            <Counter value={title.length} limit={TITLE_LIMIT} />
          </div>
          <Input
            id="ann-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="🚀 PLUT AI Is Active!"
            maxLength={TITLE_LIMIT * 2}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="ann-body">Message</Label>
            <Counter value={body.length} limit={BODY_LIMIT} />
          </div>
          <Textarea
            id="ann-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="PLUT AI is back online, and rates are up! Trade your gift cards now to enjoy better payouts."
            rows={4}
            maxLength={BODY_LIMIT * 2}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preview</h3>
        <div className="mx-auto max-w-sm rounded-2xl border bg-background p-3.5 shadow-sm">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">P</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title.trim() || "Notification title"}</p>
              <p className="line-clamp-3 text-sm text-muted-foreground">{body.trim() || "Your message will appear here."}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Plut · now</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!ready} className="gap-2">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to all users
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" /> Send to every Plut user?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>This goes out immediately as a push notification and inbox message to all users. It cannot be recalled.</p>
                  <div className="rounded-lg border bg-secondary/40 p-3 text-left">
                    <p className="text-sm font-semibold text-foreground">{title.trim()}</p>
                    <p className="mt-0.5 text-sm">{body.trim()}</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => send.mutate()}>Yes, send it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function Counter({ value, limit }: { value: number; limit: number }) {
  return (
    <span className={cn("text-[11px] tabular-nums", value > limit ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
      {value}/{limit}
    </span>
  );
}
