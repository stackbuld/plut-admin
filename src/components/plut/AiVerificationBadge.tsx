import { CheckCircle2, HelpCircle, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Advisory AI image-verification verdict produced by the ai-service worker. In v1 it only
// answers "is each submitted image actually a giftcard?" — it never moves money or
// auto-rejects. Admins act on it: clean Giftcard verdicts can be approved fast, while
// NotGiftcard / Uncertain trades deserve a closer look before payout.

export type AiVerdictKey = "NOTCHECKED" | "INPROGRESS" | "GIFTCARD" | "NOTGIFTCARD" | "UNCERTAIN";

type VerdictMeta = {
  key: AiVerdictKey;
  label: string;
  icon: LucideIcon;
  className: string;
  dotClassName: string;
  // Whether admins should scrutinise this trade before approving (drives callouts / highlights).
  needsAttention: boolean;
  spin?: boolean;
};

const META: Record<AiVerdictKey, VerdictMeta> = {
  GIFTCARD: {
    key: "GIFTCARD",
    label: "Giftcard",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
    needsAttention: false,
  },
  NOTGIFTCARD: {
    key: "NOTGIFTCARD",
    label: "Not a giftcard",
    icon: ShieldAlert,
    className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    dotClassName: "bg-red-500",
    needsAttention: true,
  },
  UNCERTAIN: {
    key: "UNCERTAIN",
    label: "Uncertain",
    icon: HelpCircle,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    dotClassName: "bg-amber-500",
    needsAttention: true,
  },
  INPROGRESS: {
    key: "INPROGRESS",
    label: "Checking…",
    icon: Loader2,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    dotClassName: "bg-blue-500",
    needsAttention: false,
    spin: true,
  },
  NOTCHECKED: {
    key: "NOTCHECKED",
    label: "Not checked",
    icon: Sparkles,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
    dotClassName: "bg-gray-400",
    needsAttention: false,
  },
};

// Normalizes whatever the API sends (upper/lower/spaces/underscores) to a known key,
// falling back to NOTCHECKED for unknown/empty values so the UI never breaks.
export function aiVerdictMeta(status: string | null | undefined): VerdictMeta {
  const key = (status ?? "").toUpperCase().replace(/[^A-Z]/g, "") as AiVerdictKey;
  return META[key] ?? META.NOTCHECKED;
}

export function formatConfidence(confidence: number | null | undefined): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Compact pill showing the AI verdict. Optionally appends the confidence and a small
 * "AI" affordance so it reads as machine-generated at a glance.
 */
export function AiVerificationBadge({
  status,
  confidence,
  showConfidence = false,
  showAiPrefix = false,
  className,
}: {
  status: string | null | undefined;
  confidence?: number | null;
  showConfidence?: boolean;
  showAiPrefix?: boolean;
  className?: string;
}) {
  const meta = aiVerdictMeta(status);
  const Icon = meta.icon;
  const conf = showConfidence ? formatConfidence(confidence) : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        meta.className,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.spin && "animate-spin")} />
      {showAiPrefix && <span className="opacity-60">AI</span>}
      {meta.label}
      {conf && <span className="font-mono opacity-70">· {conf}</span>}
    </span>
  );
}
