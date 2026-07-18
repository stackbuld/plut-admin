import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { providerSampleQueries, removeProviderReplySample, queryKeys } from "@/api";
import { Loader2, Trash2, Bot, User } from "lucide-react";
import { relativeTime } from "@/lib/format";

type Merchant = { id: string; name: string };

// The learned few-shot samples the assistant uses for this provider — view + prune.
export function MerchantSamplesDialog({
  merchant,
  onClose,
}: {
  merchant: Merchant | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const providerId = merchant?.id ?? "";

  const { data, isLoading } = useQuery({
    ...providerSampleQueries.list(providerId),
    enabled: !!merchant,
  });

  const remove = useMutation({
    mutationFn: (sampleId: string) => removeProviderReplySample(providerId, sampleId),
    onSuccess: () => {
      toast.success("Sample removed.");
      qc.invalidateQueries({ queryKey: [...queryKeys.sourcing.all(), "provider-samples", providerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const samples = data ?? [];

  return (
    <Dialog open={!!merchant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Learned samples{merchant ? ` · ${merchant.name}` : ""}</DialogTitle>
          <DialogDescription>
            Real replies the team taught the assistant. It reads these as few-shot examples to recognise this
            provider's style. Remove any that are wrong or stale.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : samples.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No samples yet. Teach some from the review queue ("Save as sample").
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {samples.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">{s.plane}</span>
                    {s.label && <span>{s.label}</span>}
                    <span className="flex items-center gap-0.5">
                      {s.source === "Manual" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      {s.source === "Manual" ? "manual" : "auto"}
                    </span>
                    <span>· {relativeTime(s.createdAt)}</span>
                  </div>
                  <p className="mt-1 break-words text-sm text-foreground/90">"{s.text}"</p>
                  {s.comment && <p className="mt-0.5 text-xs italic text-muted-foreground">note: {s.comment}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(s.id)}
                  title="Remove sample"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
