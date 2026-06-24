import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import type { Prisma } from '@prisma/client';

const vehicleInclude = {
  currentDriver: {
    select: {
      id: true,
      name: true,
      mobile: true,
      status: true,
    },
  },
};

export async function listVehicles(query: { search?: string; status?: string; page: number; limit: number }) {
  const where: Prisma.VehicleWhereInput = {};

  if (query.search) {
    where.OR = [
      { vehicleNumber: { contains: query.search, mode: 'insensitive' } },
      { brand: { contains: query.search, mode: 'insensitive' } },
      { model: { contains: query.search, mode: 'insensitive' } },
      { chassisNumber: { contains: query.search, mode: 'insensitive' } },
      { engineNumber: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    where.status = query.status as any;
  }

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: vehicleInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.vehicle.count({ where }),
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

export async function getVehicleById(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: vehicleInclude,
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  return vehicle;
}

export async function createVehicle(input: {
  vehicleNumber: string;
  vehicleType: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  fuelType: string;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  rcNumber?: string | null;
  insuranceExpiry?: string | null;
  fitnessExpiry?: string | null;
  pollutionExpiry?: string | null;
  permitExpiry?: string | null;
  currentOdometer?: number;
  status?: string;
  currentDriverId?: string | null;
}) {
  const existing = await prisma.vehicle.findUnique({
    where: { vehicleNumber: input.vehicleNumber },
  });

  if (existing) {
    throw new AppError('Vehicle number already exists', 400);
  }

  if (input.chassisNumber) {
    const existingChassis = await prisma.vehicle.findUnique({
      where: { chassisNumber: input.chassisNumber },
    });

    if (existingChassis) {
      throw new AppError('Chassis number already exists', 400);
    }
  }

  if (input.engineNumber) {
    const existingEngine = await prisma.vehicle.findUnique({
      where: { engineNumber: input.engineNumber },
    });

    if (existingEngine) {
      throw new AppError('Engine number already exists', 400);
    }
  }

  return prisma.vehicle.create({
    data: {
      vehicleNumber: input.vehicleNumber,
      vehicleType: input.vehicleType,
      brand: input.brand || null,
      model: input.model || null,
      year: input.year || null,
      fuelType: input.fuelType,
      chassisNumber: input.chassisNumber || null,
      engineNumber: input.engineNumber || null,
      rcNumber: input.rcNumber || null,
      insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
      fitnessExpiry: input.fitnessExpiry ? new Date(input.fitnessExpiry) : null,
      pollutionExpiry: input.pollutionExpiry ? new Date(input.pollutionExpiry) : null,
      permitExpiry: input.permitExpiry ? new Date(input.permitExpiry) : null,
      currentOdometer: input.currentOdometer ?? 0,
      status: (input.status as any) ?? 'AVAILABLE',
      currentDriverId: input.currentDriverId || null,
    },
    include: vehicleInclude,
  });
}

export async function updateVehicle(
  vehicleId: string,
  input: {
    vehicleNumber?: string;
    vehicleType?: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    fuelType?: string;
    chassisNumber?: string | null;
    engineNumber?: string | null;
    rcNumber?: string | null;
    insuranceExpiry?: string | null;
    fitnessExpiry?: string | null;
    pollutionExpiry?: string | null;
    permitExpiry?: string | null;
    currentOdometer?: number;
    status?: string;
    currentDriverId?: string | null;
  },
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  if (input.vehicleNumber && input.vehicleNumber !== vehicle.vehicleNumber) {
    const existing = await prisma.vehicle.findUnique({
      where: { vehicleNumber: input.vehicleNumber },
    });

    if (existing) {
      throw new AppError('Vehicle number already exists', 400);
    }
  }

  if (input.chassisNumber && input.chassisNumber !== vehicle.chassisNumber) {
    const existingChassis = await prisma.vehicle.findUnique({
      where: { chassisNumber: input.chassisNumber },
    });

    if (existingChassis) {
      throw new AppError('Chassis number already exists', 400);
    }
  }

  if (input.engineNumber && input.engineNumber !== vehicle.engineNumber) {
    const existingEngine = await prisma.vehicle.findUnique({
      where: { engineNumber: input.engineNumber },
    });

    if (existingEngine) {
      throw new AppError('Engine number already exists', 400);
    }
  }

  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      vehicleNumber: input.vehicleNumber,
      vehicleType: input.vehicleType,
      brand: input.brand === '' ? null : input.brand,
      model: input.model === '' ? null : input.model,
      year: input.year,
      fuelType: input.fuelType,
      chassisNumber: input.chassisNumber === '' ? null : input.chassisNumber,
      engineNumber: input.engineNumber === '' ? null : input.engineNumber,
      rcNumber: input.rcNumber === '' ? null : input.rcNumber,
      insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : input.insuranceExpiry === '' ? null : undefined,
      fitnessExpiry: input.fitnessExpiry ? new Date(input.fitnessExpiry) : input.fitnessExpiry === '' ? null : undefined,
      pollutionExpiry: input.pollutionExpiry ? new Date(input.pollutionExpiry) : input.pollutionExpiry === '' ? null : undefined,
      permitExpiry: input.permitExpiry ? new Date(input.permitExpiry) : input.permitExpiry === '' ? null : undefined,
      currentOdometer: input.currentOdometer,
      status: input.status as any,
      currentDriverId: input.currentDriverId === '' ? null : input.currentDriverId,
    },
    include: vehicleInclude,
  });
}

export async function updateVehicleStatus(vehicleId: string, status: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: status as any },
    include: vehicleInclude,
  });
}

export async function deleteVehicle(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  await prisma.vehicle.delete({ where: { id: vehicleId } });
  return { deleted: true };
}
