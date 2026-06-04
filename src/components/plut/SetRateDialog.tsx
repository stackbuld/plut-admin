import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DenomRateContext } from "./SetRateDialog.body";

export type { DenomRateContext } from "./SetRateDialog.body";

// Lazy-load the heavy body so the Dialog shell paints instantly with a
// skeleton on first click. Subsequent opens reuse the cached chunk.
const SetRateDialogBody = lazy(() =>
  import("./SetRateDialog.body").then((m) => ({ default: m.SetRateDialogBody })),
);

export function SetRateDialog({
  denom,
  onClose,
}: {
  denom: DenomRateContext | null;
  onClose: () => void;
}) {
  const open = denom !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0">
        {denom ? (
          <Suspense fallback={<RateFormSkeleton title={denom.activeRate ? "Update Rate" : "Set Rate"} />}>
            <SetRateDialogBody denom={denom} onClose={onClose} />
          </Suspense>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RateFormSkeleton({ title }: { title: string }) {
  return (
    <>
      <DialogHeader className="border-b px-5 py-3.5">
        <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
        <DialogDescription className="text-xs">Loading rate editor…</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 px-5 py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing form…
        </div>
        <div className="h-9 animate-pulse rounded-md bg-secondary/60" />
        <div className="h-9 animate-pulse rounded-md bg-secondary/60" />
        <div className="h-24 animate-pulse rounded-md bg-secondary/40" />
        <div className="h-9 animate-pulse rounded-md bg-secondary/60" />
      </div>
    </>
  );
}