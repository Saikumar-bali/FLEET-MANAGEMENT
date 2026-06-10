import { z } from 'zod';

export const vehicleIdParamsSchema = z.object({
  id: z.string().min(1, 'Vehicle id is required'),
});

const vehicleStatusEnum = z.enum(['AVAILABLE', 'ON_TRIP', 'UNDER_MAINTENANCE', 'UNDER_REPAIR', 'INACTIVE', 'SOLD', 'ACCIDENT']);

export const createVehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required').transform((v) => v.toUpperCase()),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  brand: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  fuelType: z.string().min(1, 'Fuel type is required'),
  chassisNumber: z.string().optional().or(z.literal('')),
  engineNumber: z.string().optional().or(z.literal('')),
  rcNumber: z.string().optional().or(z.literal('')),
  insuranceExpiry: z.string().datetime().optional().nullable(),
  fitnessExpiry: z.string().datetime().optional().nullable(),
  pollutionExpiry: z.string().datetime().optional().nullable(),
  permitExpiry: z.string().datetime().optional().nullable(),
  currentOdometer: z.number().int().min(0).default(0),
  status: vehicleStatusEnum.default('AVAILABLE'),
  currentDriverId: z.string().optional().nullable(),
});

export const updateVehicleSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required').transform((v) => v.toUpperCase()).optional(),
  vehicleType: z.string().optional(),
  brand: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  fuelType: z.string().optional(),
  chassisNumber: z.string().optional().or(z.literal('')),
  engineNumber: z.string().optional().or(z.literal('')),
  rcNumber: z.string().optional().or(z.literal('')),
  insuranceExpiry: z.string().datetime().optional().nullable(),
  fitnessExpiry: z.string().datetime().optional().nullable(),
  pollutionExpiry: z.string().datetime().optional().nullable(),
  permitExpiry: z.string().datetime().optional().nullable(),
  currentOdometer: z.number().int().min(0).optional(),
  status: vehicleStatusEnum.optional(),
  currentDriverId: z.string().optional().nullable(),
});

export const updateVehicleStatusSchema = z.object({
  status: vehicleStatusEnum,
});

export const vehicleQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
