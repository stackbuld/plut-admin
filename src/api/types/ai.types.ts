// AI assistant admin surface — conversation history + LLM/vision cost tracking.
// Mirrors the ai-service admin DTOs (GET /api/v1/ai/admin/*). Costs are USD.

export type AiConversationStatus = "Active" | "Archived";

export type AiConversationListItem = {
  id: string;
  userId: string;
  title: string | null;
  status: string;
  createdAt: string;
  lastActivityAt: string;
  messageCount: number;
  actionCount: number;
  actionTypes: string[];
  totalCostUsd: number;
  totalTokens: number;
};

// Cost roll-up for one conversation, split by capability (chat completion vs image analysis).
export type AiConversationCost = {
  totalUsd: number;
  chatUsd: number;
  imageAnalysisUsd: number;
  totalTokens: number;
  chatCalls: number;
  imageAnalysisCalls: number;
};

export type AiMessageRole = "User" | "Assistant" | "Tool" | "System";

export type AiMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  attachmentsJson: string | null;
  toolCallsJson: string | null;
  costUsd: number | null;
  totalTokens: number | null;
};

// An action the AI prepared for the user to confirm (send money, giftcard trade, airtime, …).
export type AiAction = {
  id: string;
  type: string;
  status: string;
  summaryJson: string;
  createdAt: string;
  expiresAtUtc: string | null;
};

export type AiConversationDetail = {
  id: string;
  userId: string;
  title: string | null;
  status: string;
  createdAt: string;
  lastActivityAt: string;
  cost: AiConversationCost;
  messages: AiMessage[];
  actions: AiAction[];
};

export type AiUsageTotals = {
  conversations: number;
  activeUsers: number;
  messages: number;
  totalTokens: number;
  totalCostUsd: number;
  chatCostUsd: number;
  imageAnalysisCostUsd: number;
  // Calls where the provider didn't report a cost (tokens known, cost null) — data-quality signal.
  unresolvedCostCalls: number;
};

export type AiCostByKind = { kind: string; costUsd: number; tokens: number; calls: number };
export type AiCostByModel = { model: string; costUsd: number; tokens: number; calls: number };
export type AiCostByDay = { day: string; costUsd: number; tokens: number; calls: number };

export type AiUsageStats = {
  days: number;
  totals: AiUsageTotals;
  byKind: AiCostByKind[];
  byModel: AiCostByModel[];
  byDay: AiCostByDay[];
};

export type ListAiConversationsParams = {
  userId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
