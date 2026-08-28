// crypto-service admin withdrawals surface — /api/crypto/admin/Withdrawals (same AdminOnly
// policy, same { success, data, message } envelope as every other admin fetcher in this app —
// see src/api/client.ts). Shapes verified against the actual shipped C# endpoint/DTO
// (Web/Endpoints/Withdrawals.cs -> AdminWithdrawals, AdminCryptoWithdrawalDto), not the earlier
// design doc.

/** CryptoWithdrawalStatus — eleven states, because an on-chain send has more failure surface than
 * a bank transfer. Render the exact state, never collapse into a generic "Processing":
 * Initiated -> PendingApproval -> Approved -> PendingSweep -> SweepFailed -> PendingBroadcast ->
 * Broadcasting -> Successful | Failed | Rejected | Reversed. */
export type CryptoWithdrawalStatus =
  | "Initiated"
  | "PendingApproval"
  | "Approved"
  | "PendingSweep"
  | "SweepFailed"
  | "PendingBroadcast"
  | "Broadcasting"
  | "Successful"
  | "Failed"
  | "Rejected"
  | "Reversed";

/** How this withdrawal was (or will be) approved — auto-approved under the configured threshold,
 * or requires a human admin decision. Backend sends free text, not a closed enum — keep this
 * loose rather than asserting a fixed set of literals. */
export type CryptoWithdrawalApprovalMethod = "Auto" | "Manual" | (string & {});

// ── GET /api/crypto/admin/Withdrawals?pendingOnly=false ─────────────────────
// Not paginated per the confirmed handler (GetAdminCryptoWithdrawalsQuery(bool PendingOnly)) —
// returns a flat array, most recent first.

export type AdminCryptoWithdrawal = {
  id: string;
  userId: string;
  asset: string;
  network: string;
  destinationAddress: string;
  destinationTag: string | null;
  amount: number;
  /** Pass-through cost, not Plut's revenue. */
  networkFee: number;
  /** Plut's revenue on this withdrawal. */
  platformFee: number;
  /** amount + networkFee + platformFee, as computed/returned by the backend. */
  totalDeducted: number;
  status: CryptoWithdrawalStatus;
  approvalMethod: CryptoWithdrawalApprovalMethod;
  createdAt: string;
};

export type ListCryptoWithdrawalsParams = {
  pendingOnly?: boolean;
};

// ── POST .../{withdrawalId}/reject ───────────────────────────────────────────

export type RejectCryptoWithdrawalBody = {
  reason: string;
};
