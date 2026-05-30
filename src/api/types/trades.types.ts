export type TradeStatus =
  | "Submitted"
  | "Approved"
  | "Accepted"
  | "Paid"
  | "Cancelled"
  | "Rejected";

export type TradeItemStatus = "Pending" | "Approved" | "Rejected";

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
};

export type TradeDetail = {
  id: string;
  customerId: string;
  quoteId: string;
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
};

export type ListTradesParams = {
  Status?: TradeStatus;
  CustomerId?: string;
  SubmittedFrom?: string;
  SubmittedTo?: string;
  PastSlaOnly?: boolean;
  Page?: number;
  PageSize?: number;
};
