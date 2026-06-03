export type UserStatus = "Active" | "Pending" | "Suspended";
export type KycTier = "Tier0" | "Tier1" | "Tier2" | "Tier3";

export type UserListItem = {
  userId: string;
  email: string;
  displayName: string;
  status: UserStatus;
  kycTier: KycTier;
  lastLogin: string | null;
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
  lastLogin: string | null;
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
