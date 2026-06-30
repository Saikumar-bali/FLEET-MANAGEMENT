import { ProfileType, UserProfileLinkStatus } from '@prisma/client';

export type CreateProfileLinkInput = {
  userId: string;
  profileType: ProfileType;
  profileId: string;
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateProfileLinkInput = {
  isPrimary?: boolean;
  status?: UserProfileLinkStatus;
  metadata?: Record<string, unknown>;
};

export type ProfileLinkWhereInput = {
  userId?: string;
  profileType?: ProfileType;
  profileId?: string;
  status?: UserProfileLinkStatus;
};

export type ProfileLinkResponse = {
  id: string;
  userId: string;
  profileType: ProfileType;
  profileId: string;
  isPrimary: boolean;
  status: UserProfileLinkStatus;
  linkedById: string | null;
  linkedAt: Date;
  unlinkedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};
