export type TradeStatus =
  | "Submitted"
  | "Approved"
  | "Accepted"
  | "Paid"
  | "Cancelled"
  | "Rejected";

export type TradeItemStatus = "Pending" | "Approved" | "Rejected";

// AI image-verification rollup set by the ai-service worker (advisory only — it never
// moves money or auto-rejects). Wire values arrive upper-cased from the API; the
// AiVerificationBadge normalizes, so treat this as case-insensitive.
export type TradeVerificationStatus =
  | "NOTCHECKED"
  | "INPROGRESS"
  | "GIFTCARD"
  | "NOTGIFTCARD"
  | "UNCERTAIN";

export type TradeListItem = {
  id: string;
  customerId: string;
  status: TradeStatus;
  totalCardValueUsd: number;
  totalCustomerPayoutAmount: number;
  payoutCurrency: string;
  itemCount: number;
  submittedAt: string;
  slaDeadlineAt: string;
  isPastSla: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  // AI verification rollup (advisory). "NOTCHECKED" until the worker processes the trade.
  verificationStatus: TradeVerificationStatus;
  verificationConfidence: number | null;
  verifiedAt: string | null;
};

export type TradeItem = {
  id: string;
  denominationId: string;
  brandId: string;
  countryId: string;
  denominationAmount: number;
  denominationCurrency: string;
  quantity: number;
  imageUrls: string[];
  marketRateUsd: number;
  customerRateUsd: number;
  cardValueUsd: number;
  customerPayoutUsd: number;
  customerPayoutAmount: number;
  payoutCurrency: string;
  status: TradeItemStatus;
  rejectionReason: string | null;
  // Catalog snapshot fields returned by the admin detail endpoint
  brandName: string;
  countryName: string;
  countryCode: string;
  cardFormat: string;
  fxRateToPayoutCurrency: number;
  // Per-item AI image-verification verdict (advisory).
  verificationStatus: TradeVerificationStatus;
  isGiftcardImage: boolean | null;
  imageType: string | null;
  verificationConfidence: number | null;
  verificationNotes: string | null;
};

export type TradeDetail = {
  id: string;
  customerId: string;
  quoteId: string;
  quoteSnapshotJson: string;
  status: TradeStatus;
  payoutCurrency: string;
  totalCardValueUsd: number;
  totalMarketValueUsd: number;
  totalCustomerPayoutUsd: number;
  totalCustomerPayoutAmount: number;
  totalProfitUsd: number;
  submittedAt: string;
  slaDeadlineAt: string;
  isPastSla: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  items: TradeItem[];
  // AI image-verification rollup across the line items (advisory).
  verificationStatus: TradeVerificationStatus;
  verificationConfidence: number | null;
  verifiedAt: string | null;
};

export type AdminDashboardStats = {
  pendingReview: number;
  pastSla: number;
  totalPaid: number;
  totalRejected: number;
  activeBrands: number;
  avgReviewSeconds: number | null;
};

export type ListTradesParams = {
  Status?: TradeStatus;
  CustomerId?: string;
  SubmittedFrom?: string;
  SubmittedTo?: string;
  PastSlaOnly?: boolean;
  // AI verification filter — sent as the enum name (PascalCase), bound case-insensitively
  // by the API: NotChecked | InProgress | Giftcard | NotGiftcard | Uncertain.
  VerificationStatus?: string;
  Page?: number;
  PageSize?: number;
};
