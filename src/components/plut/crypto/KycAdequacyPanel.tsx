import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CryptoKycAdequacyResult } from "@/api/types/crypto.types";

// Humanizes a PascalCase field name like "DocumentNumber" → "Document Number". Field names come
// back PascalCase from the backend (NOT upper-snake, despite what earlier design docs guessed) —
// this works for either casing defensively.
function humanizeField(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function KycAdequacyPanel({
  result,
  isLoading,
  isError,
  className,
}: {
  result: CryptoKycAdequacyResult | undefined;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-background p-4", className)}>
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Binance's Required Fields
      </h4>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking adequacy…
        </div>
      ) : isError || !result ? (
        <p className="py-4 text-sm text-muted-foreground">
          Not available yet — couldn't reach the adequacy check for this user.
        </p>
      ) : result.isAdequate && result.missingFields.length === 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm text-success">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>All of Binance's required fields are present for this user.</span>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.isAdequate
              ? "Marked adequate, but fields are listed below."
              : "This user is missing fields Binance requires before KYC can be shared."}
          </p>
          <ul className="mt-3 divide-y divide-border rounded-lg border bg-card">
            {result.missingFields.map((f) => (
              <li key={f} className="flex items-center gap-2 px-3 py-2 text-sm">
                <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <span>{humanizeField(f)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {result?.kycCaseId && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          KYC case: {result.kycCaseId}
        </p>
      )}
    </div>
  );
}
