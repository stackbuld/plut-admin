export type UserStatus = "Active" | "Pending" | "Suspended" | "Deactivated";
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

export type UserSortField = "created" | "lastLogin" | "email" | "displayName" | "kycTier";
export type SortDir = "asc" | "desc";

export type ListUsersParams = {
  search?: string;
  status?: UserStatus;
  kycTier?: KycTier;
  createdFrom?: string; // yyyy-MM-dd
  createdTo?: string; // yyyy-MM-dd
  sortBy?: UserSortField;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
};

export type MonthlySignupStat = {
  month: string; // "2026-03"
  count: number;
};

export type SignupStatsByStatus = {
  active: number;
  pending: number;
  suspended: number;
  deactivated: number;
};

export type SignupStatsByTier = {
  tier0: number;
  tier1: number;
  tier2: number;
  tier3: number;
};

export type ActiveVsDormantStats = {
  active: number;
  dormant: number;
  activityWindowDays: number;
};

export type MonthlySuspensionStat = {
  month: string; // "2026-03"
  blocks: number;
  strikes: number;
};

export type ActivationStats = {
  signupsInRange: number;
  activatedCount: number;
  activationRatePercent: number;
};

export type UserSignupStats = {
  monthlySignups: MonthlySignupStat[];
  totalUsers: number;
  newUsersInRange: number;
  growthPercent: number;
  statusBreakdown: SignupStatsByStatus;
  kycTierBreakdown: SignupStatsByTier;
  userActivity: ActiveVsDormantStats;
  suspensionTrend: MonthlySuspensionStat[];
  activation: ActivationStats;
};

export type GetUserSignupStatsParams = {
  from?: string; // yyyy-MM-dd
  to?: string; // yyyy-MM-dd
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
