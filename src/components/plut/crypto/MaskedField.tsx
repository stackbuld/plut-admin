import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Masked-by-default, click-to-reveal display components for identity-shaped data on the crypto
// admin pages. crypto-service isn't the KYC system of record (account-service is — see its own
// KYC case detail page, which shows documents unmasked by default since that page IS compliance's
// primary review workflow); most visits here are debugging a provisioning step failure that has
// nothing to do with the person's identity, so anything identity-shaped defaults to masked. No
// persistence across page loads, no extra API call — purely a local display toggle over data
// that's already in the fetched payload.

function maskValue(value: string): string {
  if (value.length <= 2) return "•".repeat(value.length || 4);
  const visible = Math.min(2, Math.floor(value.length / 4));
  return `${value.slice(0, visible)}${"•".repeat(Math.max(4, value.length - visible))}`;
}

export function MaskedField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  if (value === undefined || value === null || value === "") {
    return (
      <div className={cn("flex items-center justify-between gap-3 px-3 py-2 text-sm", className)}>
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-between gap-3 px-3 py-2 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-secondary",
          mono && "font-mono text-xs",
        )}
        title={revealed ? "Click to hide" : "Click to reveal"}
      >
        <span>{revealed ? value : maskValue(value)}</span>
        {revealed ? (
          <EyeOff className="h-3 w-3 text-muted-foreground" />
        ) : (
          <Eye className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

export function MaskedImage({
  url,
  label,
  className,
}: {
  url: string | null | undefined;
  label: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!url) {
    return (
      <div className={cn("text-center", className)}>
        <div className="grid h-28 w-28 place-items-center rounded-lg border bg-background text-[11px] text-muted-foreground">
          No image
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">{label}</p>
      </div>
    );
  }
  return (
    <div className={cn("text-center", className)}>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="group relative block h-28 w-28 overflow-hidden rounded-lg border bg-background"
        title={revealed ? "Click to hide" : "Click to reveal"}
      >
        <img
          src={url}
          alt={revealed ? label : ""}
          className={cn("h-full w-full object-cover", !revealed && "blur-xl scale-110")}
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          {revealed ? (
            <EyeOff className="h-4 w-4 text-white" />
          ) : (
            <Eye className="h-4 w-4 text-white" />
          )}
        </div>
        {!revealed && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            Hidden
          </span>
        )}
      </button>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
