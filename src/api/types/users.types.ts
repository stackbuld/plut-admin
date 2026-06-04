export type UserStatus = "Active" | "Pending" | "Suspended";
export type KycTier = "Tier0" | "Tier1" | "Tier2" | "Tier3";

export type UserListItem = {
  userId: string;
  email: string;
  displayName: string;
  phoneNumber: string | null;
  status: UserStatus;
  kycTier: KycTier;
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserDetail = {
  userId: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  zitadelUserId: string;
  kycTier: KycTier;
  status: UserStatus;
  oldUserId: string | null;
  lastLoginAt: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type ListUsersParams = {
  search?: string;
  status?: UserStatus;
  kycTier?: KycTier;
  page?: number;
  pageSize?: number;
};

export type BlockType = "Temporary" | "Permanent";

export type UserBlock = {
  id: string;
  type: BlockType;
  reason: string;
  durationHours: number | null;
  startedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string;
};

export type UserStrike = {
  id: string;
  strikeNumber: number;
  reason: string;
  tradeId: string | null;
  addedAt: string;
  isExpired: boolean;
};

export type ImageBlacklistEntry = {
  id: string;
  hash: string;
  reason: string;
  notes: string | null;
  addedAt: string;
  addedBy: string;
};

export type ListImageBlacklistParams = {
  page?: number;
  pageSize?: number;
};
