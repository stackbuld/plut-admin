import { apiPost } from "./client";

export type BroadcastRequest = {
  workflowId: string;
  subscriberIds: string[] | null;
  payload: Record<string, unknown> | null;
  toAllBatches?: boolean;
};

export type BroadcastResult = {
  batches?: number;
  subscribers?: number;
};

export const broadcastNotification = (body: BroadcastRequest) =>
  apiPost<BroadcastResult | null>("/api/v1/notifications/broadcast", body);
