import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { kycKeys, syncKycCase } from "@/api/kyc";
import type { GetKycCaseDetailResult } from "@/api/types/kyc.types";

/**
 * Resync is only meaningful for Approved User-type cases — that's the only combination the personal-info
 * sync feature acts on. Mirrors VasTransactionActions.tsx's dialog+mutation+toast+invalidate pattern.
 */
export function KycCaseActions({ kycCase }: { kycCase: GetKycCaseDetailResult }) {
  const [open, setOpen] = useState(false);
  const canResync = kycCase.status === "Approved" && kycCase.type === "User";

  if (!canResync) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Resync
        </Button>
      </div>
      <ResyncDialog caseId={kycCase.caseId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function ResyncDialog({
  caseId,
  open,
  onOpenChange,
}: {
  caseId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => syncKycCase(caseId),
    onSuccess: (r) => {
      if (r.failed > 0) {
        toast.error("Resync failed — check the raw provider response for details.");
      } else {
        toast.success("Personal info resynced from the provider.");
      }
      qc.invalidateQueries({ queryKey: kycKeys.caseDetail(caseId) });
      qc.invalidateQueries({ queryKey: kycKeys.cases() });
      qc.invalidateQueries({ queryKey: kycKeys.stats() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Resync failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resync KYC Case</DialogTitle>
          <DialogDescription>
            Re-fetches this case's verification detail from the provider and updates the stored
            personal info and documents — even if it was already synced.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm Resync
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
