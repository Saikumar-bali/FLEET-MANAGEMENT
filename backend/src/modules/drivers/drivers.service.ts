import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { Prisma } from '@prisma/client';

export async function listDrivers(query: { search?: string; status?: string; page: number; limit: number }) {
  const where: Prisma.DriverWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { mobile: { contains: query.search, mode: 'insensitive' } },
      { licenseNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    where.status = query.status as any;
  }

  const [items, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.driver.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getDriverById(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  return driver;
}

export async function createDriver(input: {
  name: string;
  mobile: string;
  alternateMobile?: string | null;
  licenseNumber: string;
  licenseExpiry?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  experienceYears?: number | null;
  status?: string;
}) {
  const existingMobile = await prisma.driver.findUnique({
    where: { mobile: input.mobile },
  });

  if (existingMobile) {
    throw new AppError('Mobile number already exists', 400);
  }

  const existingLicense = await prisma.driver.findUnique({
    where: { licenseNumber: input.licenseNumber },
  });

  if (existingLicense) {
    throw new AppError('License number already exists', 400);
  }

  return prisma.driver.create({
    data: {
      name: input.name,
      mobile: input.mobile,
      alternateMobile: input.alternateMobile || null,
      licenseNumber: input.licenseNumber,
      licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
      address: input.address || null,
      emergencyContact: input.emergencyContact || null,
      experienceYears: input.experienceYears || null,
      status: (input.status as any) ?? 'AVAILABLE',
    },
  });
}

export async function updateDriver(
  driverId: string,
  input: {
    name?: string;
    mobile?: string;
    alternateMobile?: string | null;
    licenseNumber?: string;
    licenseExpiry?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
    experienceYears?: number | null;
    status?: string;
  },
) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  if (input.mobile && input.mobile !== driver.mobile) {
    const existingMobile = await prisma.driver.findUnique({
      where: { mobile: input.mobile },
    });

    if (existingMobile) {
      throw new AppError('Mobile number already exists', 400);
    }
  }

  if (input.licenseNumber && input.licenseNumber !== driver.licenseNumber) {
    const existingLicense = await prisma.driver.findUnique({
      where: { licenseNumber: input.licenseNumber },
    });

    if (existingLicense) {
      throw new AppError('License number already exists', 400);
    }
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: {
      name: input.name,
      mobile: input.mobile,
      alternateMobile: input.alternateMobile === '' ? null : input.alternateMobile,
      licenseNumber: input.licenseNumber,
      licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : input.licenseExpiry === '' ? null : undefined,
      address: input.address === '' ? null : input.address,
      emergencyContact: input.emergencyContact === '' ? null : input.emergencyContact,
      experienceYears: input.experienceYears,
      status: input.status as any,
    },
  });
}

export async function updateDriverStatus(driverId: string, status: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  return prisma.driver.update({
    where: { id: driverId },
    data: { status: status as any },
  });
}
