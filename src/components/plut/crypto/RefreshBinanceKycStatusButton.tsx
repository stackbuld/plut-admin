import { Loader2, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { refetchBinanceKycStatus, cryptoKeys } from "@/api/crypto";
import type { CryptoKycShareStatus } from "@/api/types/crypto.types";

/** Only meaningful once something has actually been submitted to Binance — mirrors the backend's
 * own guard (CRYPTO_KYC_NOT_YET_SHARED). */
export function canRefreshBinanceKycStatus(
  kycShareStatus: CryptoKycShareStatus | undefined,
): boolean {
  return kycShareStatus !== undefined && kycShareStatus !== "NotSubmitted";
}

/**
 * Calls Binance's check-kyc-status API on demand and updates the stored record — a direct
 * complement to the async notifyUrl webhook, for when it hasn't arrived yet or you just want to
 * double-check its outcome. No confirmation dialog (unlike OperationActions' retry) — this is a
 * read-then-record action with no side effect on Binance's side, so a plain button + toast is
 * enough, matching KycCaseActions.tsx's Resync button in the account-service admin app.
 */
export function RefreshBinanceKycStatusButton({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => refetchBinanceKycStatus(userId),
    onSuccess: (r) => {
      toast.success(
        r.kycStatus ? `Binance reports: ${r.kycStatus}.` : "Binance has no status to report yet.",
      );
      qc.invalidateQueries({ queryKey: cryptoKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: cryptoKeys.lists() });
    },
    onError: (e: Error) => toast.error(mapRefreshError(e.message)),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      Refresh from Binance
    </Button>
  );
}

function mapRefreshError(code: string): string {
  if (code === "CRYPTO_KYC_NOT_YET_SHARED") {
    return "This user's KYC has never been shared with Binance — nothing to refresh.";
  }
  if (code === "CRYPTO_SUBACCOUNT_NOT_FOUND") {
    return "No sub-account found for this user.";
  }
  if (code === "CRYPTO_PROVIDER_UNAVAILABLE") {
    return "Binance didn't respond — try again shortly.";
  }
  return code || "Refresh failed.";
}
