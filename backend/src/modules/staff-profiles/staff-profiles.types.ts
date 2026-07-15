import { StaffProfileStatus } from '@prisma/client';

export type CreateStaffProfileInput = {
  profileType: string;
  name: string;
  email?: string;
  phone?: string;
  status?: StaffProfileStatus;
  metadata?: Record<string, unknown>;
};

export type UpdateStaffProfileInput = {
  name?: string;
  email?: string;
  phone?: string;
  status?: StaffProfileStatus;
  metadata?: Record<string, unknown>;
};

export type StaffProfileFilter = {
  profileType?: string;
  search?: string;
  status?: StaffProfileStatus;
  page?: number;
  limit?: number;
};
