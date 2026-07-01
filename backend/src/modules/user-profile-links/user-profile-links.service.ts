import { Prisma, ProfileType, UserProfileLinkStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { CreateProfileLinkInput, UpdateProfileLinkInput, ProfileLinkWhereInput } from './user-profile-links.types';

const VALID_PROFILE_TYPES: Record<ProfileType, string> = {
  DRIVER: 'drivers',
  MECHANIC: 'users',
  EMPLOYEE: 'users',
  FINANCE: 'users',
  COLLECTOR: 'users',
  VENDOR_CONTACT: 'vendors',
  CUSTOMER_CONTACT: 'customers',
};

async function validateProfileExists(profileType: ProfileType, profileId: string): Promise<void> {
  const tableName = VALID_PROFILE_TYPES[profileType];

  if (profileType === 'DRIVER') {
    const driver = await prisma.driver.findUnique({ where: { id: profileId } });
    if (!driver) throw new AppError('Driver not found', 404);
    if (driver.status === 'INACTIVE') throw new AppError('Cannot link inactive driver', 400);
    return;
  }

  if (profileType === 'VENDOR_CONTACT') {
    const vendor = await prisma.vendor.findUnique({ where: { id: profileId } });
    if (!vendor) throw new AppError('Vendor not found', 404);
    if (!vendor.isActive) throw new AppError('Cannot link inactive vendor', 400);
    return;
  }

  if (profileType === 'CUSTOMER_CONTACT') {
    const customer = await prisma.customer.findUnique({ where: { id: profileId } });
    if (!customer) throw new AppError('Customer not found', 404);
    if (!customer.isActive) throw new AppError('Cannot link inactive customer', 400);
    return;
  }

  // For MECHANIC, EMPLOYEE, FINANCE, COLLECTOR - these are just user-based profiles
  // The profileId is another user's ID representing that business role
  const user = await prisma.user.findUnique({ where: { id: profileId } });
  if (!user) throw new AppError('Profile user not found', 404);
  if (user.status !== 'ACTIVE') throw new AppError('Cannot link inactive user profile', 400);
}

async function assertNoDuplicateActiveLink(userId: string, profileType: ProfileType, profileId: string, excludeId?: string): Promise<void> {
  const where: Prisma.UserProfileLinkWhereInput = {
    userId,
    profileType,
    profileId,
    status: 'ACTIVE',
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.userProfileLink.findFirst({ where });
  if (existing) {
    throw new AppError('Active link already exists for this user and profile', 409);
  }
}

async function unsetPrimaryForType(userId: string, profileType: ProfileType, excludeId?: string): Promise<void> {
  const where: Prisma.UserProfileLinkWhereInput = {
    userId,
    profileType,
    isPrimary: true,
    status: 'ACTIVE',
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  await prisma.userProfileLink.updateMany({
    where,
    data: { isPrimary: false },
  });
}

export async function createProfileLink(input: CreateProfileLinkInput, linkedById: string) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new AppError('User not found', 404);
  if (user.status !== 'ACTIVE') throw new AppError('Cannot link profile to inactive user', 400);

  await validateProfileExists(input.profileType, input.profileId);
  await assertNoDuplicateActiveLink(input.userId, input.profileType, input.profileId);

  if (input.isPrimary) {
    await unsetPrimaryForType(input.userId, input.profileType);
  }

  const link = await prisma.userProfileLink.create({
    data: {
      userId: input.userId,
      profileType: input.profileType,
      profileId: input.profileId,
      isPrimary: input.isPrimary ?? false,
      status: 'ACTIVE',
      linkedById,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });

  return link;
}

export async function getProfileLinkById(id: string) {
  const link = await prisma.userProfileLink.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      linkedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!link) throw new AppError('Profile link not found', 404);
  return link;
}

export async function listProfileLinks(filters: ProfileLinkWhereInput, page = 1, limit = 20) {
  const where: Prisma.UserProfileLinkWhereInput = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.profileType) where.profileType = filters.profileType;
  if (filters.profileId) where.profileId = filters.profileId;
  if (filters.status) where.status = filters.status;

  const [items, total] = await Promise.all([
    prisma.userProfileLink.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        linkedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.userProfileLink.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserProfileLinks(userId: string, profileType?: ProfileType) {
  const where: Prisma.UserProfileLinkWhereInput = { userId };
  if (profileType) where.profileType = profileType;

  return prisma.userProfileLink.findMany({
    where,
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    include: {
      linkedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function updateProfileLink(id: string, input: UpdateProfileLinkInput) {
  const existing = await prisma.userProfileLink.findUnique({ where: { id } });
  if (!existing) throw new AppError('Profile link not found', 404);
  if (existing.status !== 'ACTIVE') throw new AppError('Cannot update non-active link', 400);

  if (input.isPrimary === true) {
    await unsetPrimaryForType(existing.userId, existing.profileType, id);
  }

  if (input.status) {
    if (input.status === 'REVOKED') {
      return prisma.userProfileLink.update({
        where: { id },
        data: {
          status: 'REVOKED',
          isPrimary: false,
          unlinkedAt: new Date(),
        },
      });
    }
  }

  const updateData: Prisma.UserProfileLinkUpdateInput = {};
  if (input.isPrimary !== undefined) updateData.isPrimary = input.isPrimary;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.metadata !== undefined) updateData.metadata = input.metadata as Prisma.InputJsonValue;

  return prisma.userProfileLink.update({
    where: { id },
    data: updateData,
  });
}

export async function revokeProfileLink(id: string) {
  const existing = await prisma.userProfileLink.findUnique({ where: { id } });
  if (!existing) throw new AppError('Profile link not found', 404);
  if (existing.status !== 'ACTIVE') throw new AppError('Link is already revoked', 400);

  return prisma.userProfileLink.update({
    where: { id },
    data: {
      status: 'REVOKED',
      isPrimary: false,
      unlinkedAt: new Date(),
    },
  });
}

export async function deleteProfileLink(id: string) {
  const existing = await prisma.userProfileLink.findUnique({ where: { id } });
  if (!existing) throw new AppError('Profile link not found', 404);

  await prisma.userProfileLink.delete({ where: { id } });
}

export async function getDriverIdForUser(userId: string): Promise<string | null> {
  const link = await prisma.userProfileLink.findFirst({
    where: {
      userId,
      profileType: 'DRIVER',
      status: 'ACTIVE',
      isPrimary: true,
    },
  });

  if (link) return link.profileId;

  const anyDriverLink = await prisma.userProfileLink.findFirst({
    where: {
      userId,
      profileType: 'DRIVER',
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });

  return anyDriverLink?.profileId ?? null;
}

export async function getProfileTypesForUser(userId: string): Promise<ProfileType[]> {
  const links = await prisma.userProfileLink.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { profileType: true },
    distinct: ['profileType'],
  });

  return links.map(l => l.profileType);
}

export async function listAvailableDrivers(search?: string, showAll = false) {
  const where: Prisma.DriverWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
      { licenseNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (!showAll) {
    where.status = { not: 'INACTIVE' };
  }

  const drivers = await prisma.driver.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 100,
  });

  const driverIds = drivers.map(d => d.id);
  const activeLinks = await prisma.userProfileLink.findMany({
    where: {
      profileType: 'DRIVER',
      profileId: { in: driverIds },
      status: 'ACTIVE',
    },
    select: { profileId: true, userId: true },
  });

  const linkMap = new Map(activeLinks.map(l => [l.profileId, l.userId]));
  const linkedUserIds = [...new Set(activeLinks.map(l => l.userId))];
  const linkedUsers = linkedUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: linkedUserIds } },
        select: { id: true, username: true },
      })
    : [];
  const userMap = new Map(linkedUsers.map(u => [u.id, u.username]));

  return drivers.map(d => ({
    driverId: d.id,
    name: d.name,
    mobile: d.mobile,
    licenseNumber: d.licenseNumber,
    status: d.status,
    linkedUserId: linkMap.get(d.id) ?? null,
    linkedUsername: linkMap.get(d.id) ? (userMap.get(linkMap.get(d.id)!) ?? null) : null,
    isLinked: linkMap.has(d.id),
  }));
}
