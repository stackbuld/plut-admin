import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cryptoOperationKeys,
  cryptoOperationQueries,
  retryCryptoOperation,
} from "@/api/crypto-operations";
import { OperationStatusBadge } from "@/components/plut/crypto/OperationStatusBadge";
import { OperationEntityLink } from "@/components/plut/crypto/OperationEntityLink";
import { OperationStepTimeline } from "@/components/plut/crypto/OperationStepTimeline";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/crypto/operations/$operationId")({
  loader: ({ context, params }) => {
    context.queryClient
      .ensureQueryData(cryptoOperationQueries.detail(params.operationId))
      .catch(() => {});
  },
  component: CryptoOperationDetail,
});

function CryptoOperationDetail() {
  const { operationId } = Route.useParams();
  const {
    data: op,
    isLoading,
    isError,
    error,
  } = useQuery(cryptoOperationQueries.detail(operationId));

  const backLink = (
    <Link
      to="/admin/crypto/operations"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to operations
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !op) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        {backLink}
        <div className="rounded-2xl border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm font-semibold text-destructive">
            Couldn't load this operation
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {backLink}

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold">{op.operationType}</h1>
              <OperationStatusBadge status={op.status} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Entity:{" "}
              <OperationEntityLink operationType={op.operationType} entityRef={op.entityRef} />
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Created {formatDateTime(op.createdAt)}</p>
            {op.completedAt && <p>Completed {formatDateTime(op.completedAt)}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Step Timeline
        </h2>
        <OperationStepTimeline
          steps={op.steps}
          emptyMessage="No steps recorded for this operation yet."
        />
      </div>

      {op.status === "Failed" && (
        <div className="flex justify-end">
          <RetryButton operationId={operationId} />
        </div>
      )}
    </div>
  );
}

function RetryButton({ operationId }: { operationId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="h-3.5 w-3.5" /> Retry
      </Button>
      <RetryDialog operationId={operationId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function RetryDialog({
  operationId,
  open,
  onOpenChange,
}: {
  operationId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => retryCryptoOperation(operationId),
    onSuccess: () => {
      toast.success("Retry submitted — resuming from the last failed step.");
      qc.invalidateQueries({ queryKey: cryptoOperationKeys.detail(operationId) });
      qc.invalidateQueries({ queryKey: cryptoOperationKeys.lists() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Retry failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retry Operation</DialogTitle>
          <DialogDescription>
            Resumes this operation from whichever step last failed — already-succeeded steps are
            skipped. Use this only when no more specific entity-level retry is available for this
            operation type.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
