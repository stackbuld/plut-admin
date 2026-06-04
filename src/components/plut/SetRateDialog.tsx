import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DenomRateContext } from "./SetRateDialog.body";

export type { DenomRateContext } from "./SetRateDialog.body";

// Lazy-load the heavy body so clicking Update/Set Rate paints the modal
// instantly with a skeleton instead of freezing while React mounts ~540
// lines of form + Radix popovers.
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
    <>
      {/* Shell renders immediately so the user gets visual feedback on click */}
      <Suspense fallback={null}>
        {open && <SetRateDialogBody denom={denom} onClose={onClose} />}
      </Suspense>

      {/* Fallback shell — only visible during the brief lazy-load window */}
      <FallbackShell open={open} denom={denom} onClose={onClose} />
    </>
  );
}

function FallbackShell({
  open,
  denom,
  onClose,
}: {
  open: boolean;
  denom: DenomRateContext | null;
  onClose: () => void;
}) {
  // Once the lazy body mounts, IT owns the Dialog. We only render the shell
  // before the chunk resolves. Detect that via a tiny module flag.
  if (!open || bodyLoaded) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b px-5 py-3.5">
          <DialogTitle className="text-sm font-semibold">
            {denom?.activeRate ? "Update Rate" : "Set Rate"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Loading rate editor…
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing form…
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Set to true after the lazy chunk has loaded once, so the fallback never
// flashes on subsequent opens.
let bodyLoaded = false;
import("./SetRateDialog.body").then(() => {
  bodyLoaded = true;
});