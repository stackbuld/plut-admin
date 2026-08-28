import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setCryptoAssetLogo, cryptoAssetKeys } from "@/api/crypto-assets";

/**
 * Takes a text URL, not a file upload — logo hosting isn't part of this endpoint (see
 * SetCryptoAssetLogoCommand.cs: it's a bare `{ logoUrl }` PUT). Not touched by the 24h provider
 * catalogue refresh, so this is the only way the logo is ever set, and the only way it's ever wiped.
 *
 * The response here is the narrower public CryptoAssetDto (no isEnabled/provider fields — see
 * crypto-assets.types.ts), so on success we invalidate the admin list query rather than trying to
 * splice this response into the cache.
 */
export function ChangeAssetLogoDialog({
  asset,
  currentLogoUrl,
  open,
  onOpenChange,
}: {
  asset: string;
  currentLogoUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [url, setUrl] = useState(currentLogoUrl);

  useEffect(() => {
    if (open) setUrl(currentLogoUrl);
  }, [open, currentLogoUrl]);

  const mutation = useMutation({
    mutationFn: (logoUrl: string) => setCryptoAssetLogo(asset, logoUrl),
    onSuccess: () => {
      toast.success("Logo updated.");
      qc.invalidateQueries({ queryKey: cryptoAssetKeys.list() });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change logo — {asset}</DialogTitle>
          <DialogDescription>
            A direct image URL. Persists until changed here again — never overwritten by the
            provider catalogue refresh.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border bg-secondary">
            {url ? (
              <img
                src={url}
                alt=""
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">{asset.slice(0, 3)}</span>
            )}
          </div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate(url.trim())}
            disabled={mutation.isPending || url.trim().length === 0}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
