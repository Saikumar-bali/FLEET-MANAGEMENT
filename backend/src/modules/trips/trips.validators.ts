import { z } from 'zod';

export const tripIdParamsSchema = z.object({
  id: z.string().min(1, 'Trip id is required'),
});

const tripStatusEnum = z.enum(['DRAFT', 'SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED']);
const tripTypeEnum = z.enum(['TRANSFER', 'DELIVERY', 'PICKUP', 'SERVICE', 'INTERNAL']);

export const createTripSchema = z
  .object({
    tripNumber: z.string().optional(),
    tripType: tripTypeEnum,
    vehicleId: z.string().min(1, 'Vehicle is required'),
    driverId: z.string().optional().nullable(),
    assistantDriverId: z.string().optional().nullable(),
    originName: z.string().min(1, 'Origin name is required'),
    originAddress: z.string().optional().nullable(),
    destinationName: z.string().min(1, 'Destination name is required'),
    destinationAddress: z.string().optional().nullable(),
    plannedStartAt: z.string().datetime().optional().nullable(),
    plannedEndAt: z.string().datetime().optional().nullable(),
    purpose: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.plannedStartAt && data.plannedEndAt) {
        return new Date(data.plannedEndAt) >= new Date(data.plannedStartAt);
      }
      return true;
    },
    { message: 'Planned end time cannot be before planned start time', path: ['plannedEndAt'] },
  );

export const updateTripSchema = z
  .object({
    tripType: tripTypeEnum.optional(),
    vehicleId: z.string().min(1).optional(),
    driverId: z.string().optional().nullable(),
    assistantDriverId: z.string().optional().nullable(),
    originName: z.string().min(1).optional(),
    originAddress: z.string().optional().nullable(),
    destinationName: z.string().min(1).optional(),
    destinationAddress: z.string().optional().nullable(),
    plannedStartAt: z.string().datetime().optional().nullable(),
    plannedEndAt: z.string().datetime().optional().nullable(),
    startOdometer: z.number().int().min(0).optional().nullable(),
    endOdometer: z.number().int().min(0).optional().nullable(),
    distanceKm: z.number().int().min(0).optional().nullable(),
    purpose: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.plannedStartAt && data.plannedEndAt) {
        return new Date(data.plannedEndAt) >= new Date(data.plannedStartAt);
      }
      return true;
    },
    { message: 'Planned end time cannot be before planned start time', path: ['plannedEndAt'] },
  )
  .refine(
    (data) => {
      if (data.startOdometer !== undefined && data.startOdometer !== null && data.endOdometer !== undefined && data.endOdometer !== null) {
        return data.endOdometer >= data.startOdometer;
      }
      return true;
    },
    { message: 'End odometer cannot be less than start odometer', path: ['endOdometer'] },
  );

export const scheduleTripSchema = z.object({
  plannedStartAt: z.string().datetime().optional().nullable(),
  plannedEndAt: z.string().datetime().optional().nullable(),
  driverId: z.string().optional().nullable(),
  assistantDriverId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const startTripSchema = z
  .object({
    startOdometer: z.number().int().min(0).optional(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startOdometer !== undefined && data.startOdometer !== null) {
        return data.startOdometer >= 0;
      }
      return true;
    },
    { message: 'Start odometer cannot be negative', path: ['startOdometer'] },
  );

export const completeTripSchema = z
  .object({
    endOdometer: z.number().int().min(0).optional(),
    distanceKm: z.number().int().min(0).optional(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.endOdometer !== undefined && data.endOdometer !== null && data.endOdometer < 0) {
        return false;
      }
      return true;
    },
    { message: 'End odometer cannot be negative', path: ['endOdometer'] },
  );

export const cancelTripSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const tripQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  tripType: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
