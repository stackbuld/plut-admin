import type {
  AdminWithdrawal,
  ApproveWithdrawalBody,
  ListWithdrawalsParams,
  RejectWithdrawalBody,
  WithdrawalsSummary,
} from "@/api/types/withdrawals.types";
import type { PagedResult } from "@/api/types/common";

// ── Seed data ────────────────────────────────────────────────────────────────

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

const SEED: AdminWithdrawal[] = [
  {
    withdrawalId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    walletId: "ebf7fa34-a622-470d-aca2-779bd0b5a99f",
    userId: "3e391f8a-0abd-4afa-9b20-5052f3a39565",
    userName: "John Adekunle Doe",
    status: "PendingApproval",
    amount: 5000, fee: 10, totalAmount: 5010, currency: "NGN",
    reference: "WDR_20260603_a1b2c3d4e5f678",
    providerReference: null,
    bankCode: "058", bankName: "GTBank",
    accountNumber: "0123456789", accountName: "John Adekunle Doe",
    failureReason: null, approvalMethod: null, settledBy: null,
    createdAt: iso(1000 * 60 * 12), completedAt: null,
    walletBalance: 45230, estimatedArrival: "Within 24 hours",
  },
  {
    withdrawalId: "f9e8d7c6-b5a4-3210-9876-543210fedcba",
    walletId: "11111111-2222-3333-4444-555555555555",
    userId: "22222222-3333-4444-5555-666666666666",
    userName: "Chiamaka Eze",
    status: "PendingApproval",
    amount: 25000, fee: 25, totalAmount: 25025, currency: "NGN",
    reference: "WDR_20260603_f9e8d7c6b5a432",
    providerReference: null,
    bankCode: "044", bankName: "Access Bank",
    accountNumber: "9988776655", accountName: "Chiamaka N. Eze",
    failureReason: null, approvalMethod: null, settledBy: null,
    createdAt: iso(1000 * 60 * 47), completedAt: null,
    walletBalance: 132450, estimatedArrival: "Within 24 hours",
  },
  {
    withdrawalId: "abcdef01-2345-6789-abcd-ef0123456789",
    walletId: "77777777-8888-9999-aaaa-bbbbbbbbbbbb",
    userId: "88888888-9999-aaaa-bbbb-cccccccccccc",
    userName: "Tunde Bakare",
    status: "PendingApproval",
    amount: 100000, fee: 50, totalAmount: 100050, currency: "NGN",
    reference: "WDR_20260603_abcdef0123456",
    providerReference: null,
    bankCode: "057", bankName: "Zenith Bank",
    accountNumber: "2233445566", accountName: "Babatunde Bakare",
    failureReason: null, approvalMethod: null, settledBy: null,
    createdAt: iso(1000 * 60 * 5), completedAt: null,
    walletBalance: 320000, estimatedArrival: "Within 24 hours",
  },
  {
    withdrawalId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    walletId: "c3d4e5f6-a7b8-9012-cdef-345678901234",
    userId: "d4e5f6a7-b8c9-0123-defa-456789012345",
    userName: "Amaka Obi",
    status: "Successful",
    amount: 15000, fee: 10, totalAmount: 15010, currency: "NGN",
    reference: "WDR_20260602_b2c3d4e5f6a7b8",
    providerReference: "TRF_5678901234",
    bankCode: "044", bankName: "Access Bank",
    accountNumber: "9876543210", accountName: "Amaka Obi",
    failureReason: null, approvalMethod: "Provider", settledBy: null,
    createdAt: iso(1000 * 60 * 60 * 22), completedAt: iso(1000 * 60 * 60 * 21),
    walletBalance: 8200, estimatedArrival: "Within 24 hours",
  },
  {
    withdrawalId: "c2d3e4f5-a6b7-8901-cdef-345678901234",
    walletId: "d2e3f4a5-b6c7-8901-defa-456789012345",
    userId: "e2f3a4b5-c6d7-8901-efab-567890123456",
    userName: "Funke Adeyemi",
    status: "PendingProvider",
    amount: 8500, fee: 10, totalAmount: 8510, currency: "NGN",
    reference: "WDR_20260602_c2d3e4f5a6b789",
    providerReference: "TRF_8901234567",
    bankCode: "011", bankName: "First Bank",
    accountNumber: "3344556677", accountName: "Funke O. Adeyemi",
    failureReason: null, approvalMethod: "Provider", settledBy: null,
    createdAt: iso(1000 * 60 * 60 * 3), completedAt: null,
    walletBalance: 41000, estimatedArrival: "Within 24 hours",
  },
  {
    withdrawalId: "d2e3f4a5-b6c7-8901-defa-456789012345",
    walletId: "e2f3a4b5-c6d7-8901-efab-567890123456",
    userId: "f2a3b4c5-d6e7-8901-fabc-678901234567",
    userName: "Ibrahim Musa",
    status: "Failed",
    amount: 12000, fee: 10, totalAmount: 12010, currency: "NGN",
    reference: "WDR_20260601_d2e3f4a5b6c789",
    providerReference: "TRF_1112131415",
    bankCode: "070", bankName: "Fidelity Bank",
    accountNumber: "4455667788", accountName: "Ibrahim A. Musa",
    failureReason: "Bank returned: account name mismatch.",
    approvalMethod: "Provider", settledBy: null,
    createdAt: iso(1000 * 60 * 60 * 30), completedAt: iso(1000 * 60 * 60 * 29),
    walletBalance: 12010, estimatedArrival: "Within 24 hours",
  },
  {
    withdrawalId: "e2f3a4b5-c6d7-8901-efab-567890123456",
    walletId: "f2a3b4c5-d6e7-8901-fabc-678901234567",
    userId: "a3b4c5d6-e7f8-9012-abcd-789012345678",
    userName: "Ngozi Okafor",
    status: "Rejected",
    amount: 75000, fee: 25, totalAmount: 75025, currency: "NGN",
    reference: "WDR_20260530_e2f3a4b5c6d789",
    providerReference: null,
    bankCode: "232", bankName: "Sterling Bank",
    accountNumber: "5566778899", accountName: "Ngozi V. Okafor",
    failureReason: "Suspicious transaction pattern — account under review.",
    approvalMethod: null, settledBy: "ops@plut.ng",
    createdAt: iso(1000 * 60 * 60 * 96), completedAt: iso(1000 * 60 * 60 * 95),
    walletBalance: 75025, estimatedArrival: "Within 24 hours",
  },
];

const store: AdminWithdrawal[] = [...SEED];

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));

function buildSummary(): WithdrawalsSummary {
  const sumBy = (s: AdminWithdrawal["status"]) => {
    const rows = store.filter((w) => w.status === s);
    return { count: rows.length, total: rows.reduce((a, b) => a + b.totalAmount, 0) };
  };
  const pa = sumBy("PendingApproval");
  const pp = sumBy("PendingProvider");
  const ok = sumBy("Successful");
  const fa = sumBy("Failed");
  const rj = sumBy("Rejected");
  return {
    totalCount: store.length,
    totalAmount: store.reduce((a, b) => a + b.totalAmount, 0),
    pendingApprovalCount: pa.count, pendingApprovalAmount: pa.total,
    pendingProviderCount: pp.count, pendingProviderAmount: pp.total,
    successfulCount: ok.count, successfulAmount: ok.total,
    failedCount: fa.count, failedAmount: fa.total,
    rejectedCount: rj.count, rejectedAmount: rj.total,
    byStatus: [
      { status: "PendingApproval", count: pa.count, totalAmount: pa.total },
      { status: "PendingProvider", count: pp.count, totalAmount: pp.total },
      { status: "Successful", count: ok.count, totalAmount: ok.total },
      { status: "Failed", count: fa.count, totalAmount: fa.total },
      { status: "Rejected", count: rj.count, totalAmount: rj.total },
    ],
  };
}

// ── Mock endpoints ───────────────────────────────────────────────────────────

export async function mockGetSummary(): Promise<WithdrawalsSummary> {
  await delay(250);
  return buildSummary();
}

export async function mockListWithdrawals(
  params: ListWithdrawalsParams = {},
): Promise<PagedResult<AdminWithdrawal>> {
  await delay();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  let items = [...store];
  if (params.status && params.status !== "All") items = items.filter((w) => w.status === params.status);
  if (params.userId) items = items.filter((w) => w.userId === params.userId);
  if (params.walletId) items = items.filter((w) => w.walletId === params.walletId);
  if (params.dateFrom) {
    const t = new Date(params.dateFrom).getTime();
    items = items.filter((w) => new Date(w.createdAt).getTime() >= t);
  }
  if (params.dateTo) {
    const t = new Date(params.dateTo).getTime();
    items = items.filter((w) => new Date(w.createdAt).getTime() <= t);
  }
  if (params.query) {
    const q = params.query.toLowerCase();
    items = items.filter(
      (w) =>
        w.userName?.toLowerCase().includes(q) ||
        w.reference.toLowerCase().includes(q) ||
        w.accountNumber.includes(q),
    );
  }

  // Server-enforced sort: PendingApproval first, then createdAt DESC
  items.sort((a, b) => {
    const ap = a.status === "PendingApproval" ? 0 : 1;
    const bp = b.status === "PendingApproval" ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalCount = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function mockGetWithdrawal(id: string): Promise<AdminWithdrawal> {
  await delay(250);
  const row = store.find((w) => w.withdrawalId === id);
  if (!row) throw new Error("Withdrawal.NotFound");
  return row;
}

export async function mockApproveWithdrawal(
  id: string,
  body: ApproveWithdrawalBody,
): Promise<true> {
  await delay(600);
  const row = store.find((w) => w.withdrawalId === id);
  if (!row) throw new Error("Withdrawal.NotFound");
  if (row.status !== "PendingApproval") throw new Error("Withdrawal.InvalidStatusForApproval");
  const method = body.method ?? "Provider";
  row.approvalMethod = method;
  if (method === "Manual") {
    row.status = "Successful";
    row.completedAt = new Date().toISOString();
    row.settledBy = "ops@plut.ng";
  } else {
    row.status = "PendingProvider";
    row.providerReference = `TRF_${Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000)}`;
  }
  return true;
}

export async function mockRejectWithdrawal(
  id: string,
  body: RejectWithdrawalBody,
): Promise<true> {
  await delay(600);
  const row = store.find((w) => w.withdrawalId === id);
  if (!row) throw new Error("Withdrawal.NotFound");
  if (row.status !== "PendingApproval") throw new Error("Withdrawal.InvalidStatusForRejection");
  row.status = "Rejected";
  row.failureReason = body.reason;
  row.completedAt = new Date().toISOString();
  row.settledBy = "ops@plut.ng";
  return true;
}