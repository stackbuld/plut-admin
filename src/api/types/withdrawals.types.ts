export type WithdrawalStatus =
  | "Initiated"
  | "PendingLedger"
  | "PendingApproval"
  | "PendingProvider"
  | "Successful"
  | "Failed"
  | "Reversed"
  | "Rejected";

export type ApprovalMethod = "Provider" | "Manual";

// Returned by GET /api/admin/Withdrawals (list)
export type AdminWithdrawal = {
  withdrawalId: string;
  walletId: string;
  userId: string;
  userName: string | null;
  status: WithdrawalStatus;
  amount: number;
  fee: number;
  totalAmount: number;
  currency: string;
  reference: string;
  providerReference: string | null;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string | null;
  failureReason: string | null;
  approvalMethod: ApprovalMethod | null;
  settledBy: string | null;
  createdAt: string;
  completedAt: string | null;
};

// Returned by GET /api/admin/Withdrawals/{withdrawalId} (detail) — superset of AdminWithdrawal
export type AdminWithdrawalDetail = AdminWithdrawal & {
  walletBalance: number;
  estimatedArrival: string | null;
};

export type WithdrawalsSummary = {
  totalCount: number;
  totalAmount: number;
  pendingApprovalCount: number;
  pendingApprovalAmount: number;
  pendingProviderCount: number;
  pendingProviderAmount: number;
  successfulCount: number;
  successfulAmount: number;
  failedCount: number;
  failedAmount: number;
  rejectedCount: number;
  rejectedAmount: number;
  byStatus: { status: WithdrawalStatus; count: number; totalAmount: number }[];
};

export type ListWithdrawalsParams = {
  status?: WithdrawalStatus | "All";
  userId?: string;
  walletId?: string;
  dateFrom?: string;
  dateTo?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export type ApproveWithdrawalBody = {
  region: "NG";
  method?: ApprovalMethod;
};

export type RejectWithdrawalBody = {
  region: "NG";
  reason: string;
};