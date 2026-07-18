// ── Merchants (a.k.a. providers / redemption partners) ────────────────────────
// Backend enums serialize as STRINGS.

export type MerchantChannelType = "Waha" | "Telegram" | "WhatsAppBusiness";
export type MerchantStatus = "Active" | "Paused" | "Disabled";
export type MerchantTrustTier = "Probation" | "Standard" | "Trusted";
export type MerchantCardFormat = "Physical" | "ECode";

export type ProviderCapabilityDto = {
  id: string;
  brandCode: string;
  countryCode?: string | null;
  cardFormat?: MerchantCardFormat | null;
  minDenomination?: number | null;
  maxDenomination?: number | null;
  isWildcard: boolean;
  isActive: boolean;
};

export type ProviderDto = {
  id: string;
  name: string;
  channelType: MerchantChannelType;
  channelChatId: string;
  channelDisplayHint?: string | null;
  status: MerchantStatus;
  trustTier: MerchantTrustTier;
  maxConcurrentRedemptions: number;
  rateRequestLocale?: string | null;
  notes?: string | null;
  rateReplyGuidance?: string | null;
  redemptionReplyGuidance?: string | null;
  agentNotes?: string | null;
  capabilities: ProviderCapabilityDto[];
};

export type CreateMerchantBody = {
  name: string;
  channelType: MerchantChannelType;
  channelChatId: string;
  channelDisplayHint?: string | null;
  trustTier: MerchantTrustTier;
  maxConcurrentRedemptions?: number;
  rateRequestLocale?: string | null;
  notes?: string | null;
  rateReplyGuidance?: string | null;
  redemptionReplyGuidance?: string | null;
  agentNotes?: string | null;
};

export type UpdateMerchantBody = {
  name: string;
  channelDisplayHint?: string | null;
  rateRequestLocale?: string | null;
  notes?: string | null;
  trustTier: MerchantTrustTier;
  maxConcurrentRedemptions?: number;
  rateReplyGuidance?: string | null;
  redemptionReplyGuidance?: string | null;
  agentNotes?: string | null;
};

export type SetMerchantStatusBody = {
  status: MerchantStatus;
};

export type AddCapabilityBody = {
  brandCode: string;
  countryCode?: string | null;
  cardFormat?: MerchantCardFormat | null;
  minDenomination?: number | null;
  maxDenomination?: number | null;
  isWildcard: boolean;
};

// One card spec in a bulk add (same shape as AddCapabilityBody).
export type CapabilitySpec = AddCapabilityBody;

// Bulk add many capabilities at once (e.g. several brands × several countries).
export type AddCapabilitiesBody = { items: CapabilitySpec[] };

// Server skips specs the provider already has instead of erroring, and reports the tallies.
export type AddCapabilitiesResult = {
  added: number;
  skipped: number;
  capabilityIds: string[];
};
