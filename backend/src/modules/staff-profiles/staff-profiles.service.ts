import { Prisma, StaffProfileStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { CreateStaffProfileInput, UpdateStaffProfileInput, StaffProfileFilter } from './staff-profiles.types';

export async function createStaffProfile(input: CreateStaffProfileInput) {
  if (input.email) {
    const existing = await prisma.staffProfile.findFirst({
      where: { email: input.email },
    });
    if (existing) throw new AppError('A staff profile with this email already exists', 409);
  }

  return prisma.staffProfile.create({
    data: {
      profileType: input.profileType,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      status: input.status ?? 'ACTIVE',
      metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  });
}

export async function getStaffProfileById(id: string) {
  const profile = await prisma.staffProfile.findUnique({ where: { id } });
  if (!profile) throw new AppError('Staff profile not found', 404);
  return profile;
}

export async function listStaffProfiles(filters: StaffProfileFilter) {
  const where: Prisma.StaffProfileWhereInput = {};
  if (filters.profileType) where.profileType = filters.profileType;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const [items, total] = await Promise.all([
    prisma.staffProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staffProfile.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateStaffProfile(id: string, input: UpdateStaffProfileInput) {
  const existing = await prisma.staffProfile.findUnique({ where: { id } });
  if (!existing) throw new AppError('Staff profile not found', 404);

  if (input.email && input.email !== existing.email) {
    const duplicate = await prisma.staffProfile.findFirst({
      where: { email: input.email, id: { not: id } },
    });
    if (duplicate) throw new AppError('A staff profile with this email already exists', 409);
  }

  const updateData: Prisma.StaffProfileUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.metadata !== undefined) updateData.metadata = input.metadata as Prisma.InputJsonValue;

  return prisma.staffProfile.update({ where: { id }, data: updateData });
}

export async function deleteStaffProfile(id: string) {
  const existing = await prisma.staffProfile.findUnique({ where: { id } });
  if (!existing) throw new AppError('Staff profile not found', 404);

  await prisma.staffProfile.delete({ where: { id } });
}

export async function listAvailableStaffProfiles(profileType: string, search?: string) {
  const where: Prisma.StaffProfileWhereInput = {
    profileType,
    status: 'ACTIVE',
  };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const profiles = await prisma.staffProfile.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 100,
  });

  const profileIds = profiles.map(p => p.id);
  const activeLinks = await prisma.userProfileLink.findMany({
    where: {
      profileType: profileType as any,
      profileId: { in: profileIds },
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

  return profiles.map(p => ({
    profileId: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    profileType: p.profileType,
    status: p.status,
    linkedUserId: linkMap.get(p.id) ?? null,
    linkedUsername: linkMap.get(p.id) ? (userMap.get(linkMap.get(p.id)!) ?? null) : null,
    isLinked: linkMap.has(p.id),
  }));
}
