import type { CryptoOperationStepDto } from "@/api/types/crypto.types";
import { OperationStatusBadge } from "./OperationStatusBadge";

/**
 * Numbered step-by-step timeline for a Multi-Step Operation — status badge per step, attempt
 * count, expandable JSON output/error. Extracted from the sub-accounts detail page
 * (`_app.admin.crypto.subaccounts.$userId.tsx`'s former `StepTimelinePanel`) so the Operations
 * Explorer's detail page (`_app.admin.crypto.operations.$operationId.tsx`) can reuse the exact
 * same rendering — both are fed the identical `CryptoOperationStepDto[]` shape, one embedded
 * inside a sub-account's `latestOperation`, the other fetched directly from
 * `GET /api/crypto/admin/Operations/{operationId}`. Keep this the single implementation; don't
 * fork a second one.
 */
export function OperationStepTimeline({
  steps,
  stepOrder,
  emptyMessage = "No steps recorded yet.",
}: {
  steps: CryptoOperationStepDto[];
  /** Optional fixed step-name order to sort by (sub-accounts' provisioning flow has one fixed
   * sequence). Omit to render steps in the order the API returned them — the Operations Explorer
   * covers five different operation types with five different step sequences, so it doesn't
   * hardcode any one of them. */
  stepOrder?: string[];
  emptyMessage?: string;
}) {
  if (steps.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const ordered = stepOrder
    ? [...steps].sort((x, y) => stepOrder.indexOf(x.stepName) - stepOrder.indexOf(y.stepName))
    : steps;

  return (
    <ol className="mt-2 space-y-3">
      {ordered.map((step, i) => (
        <li key={step.stepName} className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-sm font-semibold">{step.stepName}</span>
            <OperationStatusBadge status={step.status} />
            <span className="ml-auto text-xs text-muted-foreground">
              {step.attempts} attempt{step.attempts === 1 ? "" : "s"}
            </span>
          </div>

          {step.error && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {step.error}
            </div>
          )}

          {step.output && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Output
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-secondary/60 p-2 text-[11px]">
                {formatJson(step.output)}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
