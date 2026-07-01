import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/appError';
import { prisma } from '../../lib/prisma';
import { getDriverIdForUser } from '../user-profile-links/user-profile-links.service';
import { createAuditLog } from '../audit/audit.service';
import { extractFromReceipt } from '../fuel/fuel-receipt-extraction.service';

function generateTripNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TR-${timestamp}-${random}`;
}

function generateDocNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `DOC-${timestamp}-${random}`;
}

async function getLinkedDriver(userId: string) {
  const driverId = await getDriverIdForUser(userId);
  if (!driverId) {
    throw new AppError('No linked driver profile found. Link a driver profile to access portal features.', 404);
  }
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw new AppError('Linked driver profile no longer exists.', 404);
  }
  return driver;
}

export async function driverProfileController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  return sendSuccess(res, driver);
}

export async function driverTripsController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id };
  const [items, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
        driver: { select: { id: true, name: true, mobile: true } },
      },
    }),
    prisma.trip.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function driverVehiclesController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { currentDriverId: driver.id },
        { trips: { some: { driverId: driver.id } } },
      ],
    },
    include: {
      trips: {
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, tripNumber: true },
      },
    },
    distinct: ['id'],
  });

  const result = vehicles.map(v => ({
    id: v.id,
    vehicleNumber: v.vehicleNumber,
    vehicleType: v.vehicleType,
    brand: v.brand,
    model: v.model,
    status: v.status,
    currentDriverId: driver.id,
    isCurrent: v.currentDriverId === driver.id,
    lastTripId: v.trips[0]?.id ?? null,
    lastTripNumber: v.trips[0]?.tripNumber ?? null,
    source: v.currentDriverId === driver.id ? ('CURRENT_ASSIGNMENT' as const) : ('TRIP_HISTORY' as const),
  }));

  return sendSuccess(res, result);
}

export async function driverDocumentsController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const driverTripIds = await prisma.trip.findMany({
    where: { driverId: driver.id },
    select: { id: true },
  }).then(rows => rows.map(r => r.id));

  const driverVehicleIds = await prisma.vehicle.findMany({
    where: {
      OR: [
        { currentDriverId: driver.id },
        { trips: { some: { driverId: driver.id } } },
      ],
    },
    select: { id: true },
  }).then(rows => rows.map(r => r.id));

  const driverFuelEntryIds = await prisma.fuelEntry.findMany({
    where: { driverId: driver.id },
    select: { id: true },
  }).then(rows => rows.map(r => r.id));

  const where = {
    documentStatus: 'ACTIVE' as const,
    OR: [
      { driverId: driver.id },
      { tripId: { in: driverTripIds.length > 0 ? driverTripIds : [''] } },
      { vehicleId: { in: driverVehicleIds.length > 0 ? driverVehicleIds : [''] } },
      { fuelEntryId: { in: driverFuelEntryIds.length > 0 ? driverFuelEntryIds : [''] } },
      { uploadedById: req.authUser!.id },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentType: true,
        documentCategory: true,
        expiryDate: true,
        verificationStatus: true,
        createdAt: true,
        reviewComments: true,
      },
    }),
    prisma.document.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function driverFuelController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id };
  const [items, total] = await Promise.all([
    prisma.fuelEntry.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { fuelDate: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
      },
    }),
    prisma.fuelEntry.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function driverExpensesController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where = { driverId: driver.id };
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { expenseDate: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// ─── WRITE CONTROLLERS ───

async function assertDriverOwnsVehicle(driverId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new AppError('Vehicle not found', 404);
  const isRelated = await prisma.trip.findFirst({
    where: { driverId, vehicleId },
  });
  if (!isRelated && vehicle.currentDriverId !== driverId) {
    throw new AppError('Vehicle is not assigned to your driver profile', 403);
  }
  return vehicle;
}

async function assertDriverOwnsTrip(driverId: string, tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new AppError('Trip not found', 404);
  if (trip.driverId !== driverId) {
    throw new AppError('Trip does not belong to your driver profile', 403);
  }
  return trip;
}

export async function driverCreateTripController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  const { vehicleId, originName, destinationName, tripType, plannedStartAt, plannedEndAt, notes, purpose } = req.body;
  if (!vehicleId || !originName || !destinationName) {
    throw new AppError('vehicleId, originName, and destinationName are required', 400);
  }

  await assertDriverOwnsVehicle(driver.id, vehicleId);

  const tripNumber = generateTripNumber();
  const trip = await prisma.$transaction(async (tx) => {
    const created = await tx.trip.create({
      data: {
        tripNumber,
        tripType: (tripType || 'DELIVERY') as any,
        status: 'DRAFT',
        vehicleId,
        driverId: driver.id,
        originName,
        destinationName,
        plannedStartAt: plannedStartAt ? new Date(plannedStartAt) : null,
        plannedEndAt: plannedEndAt ? new Date(plannedEndAt) : null,
        purpose: purpose || null,
        notes: notes || null,
        createdById: userId,
      },
    });

    await tx.tripHistory.create({
      data: {
        tripId: created.id,
        action: 'CREATED',
        fromStatus: null,
        toStatus: 'DRAFT',
        remarks: 'Trip created by driver',
        metadata: { tripNumber: created.tripNumber, vehicleId: created.vehicleId, driverId: driver.id } as any,
        createdById: userId,
      },
    });

    return created;
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.trip.create',
    entityType: 'Trip',
    entityId: trip.id,
    metadata: { tripNumber, vehicleId, driverId: driver.id },
  });

  return sendSuccess(res, trip, 'Trip created', 201);
}

export async function driverStartTripController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;
  const trip = await assertDriverOwnsTrip(driver.id, String(req.params.id));

  if (trip.status !== 'DRAFT' && trip.status !== 'SCHEDULED') {
    throw new AppError('Only draft or scheduled trips can be started', 400);
  }

  const { startOdometer, notes } = req.body;

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: 'STARTED',
        actualStartAt: new Date(),
        startOdometer: startOdometer ?? null,
        notes: notes !== undefined ? notes : trip.notes,
      },
    });

    await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'ON_TRIP' } });
    await tx.driver.update({ where: { id: driver.id }, data: { status: 'ON_TRIP' } });

    await tx.tripHistory.create({
      data: {
        tripId: trip.id,
        action: 'STARTED',
        fromStatus: trip.status,
        toStatus: 'STARTED',
        remarks: 'Trip started by driver',
        metadata: { startOdometer } as any,
        createdById: userId,
      },
    });

    return t;
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.trip.start',
    entityType: 'Trip',
    entityId: trip.id,
    metadata: { fromStatus: trip.status, driverId: driver.id },
  });

  return sendSuccess(res, updated, 'Trip started');
}

export async function driverEndTripController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;
  const trip = await assertDriverOwnsTrip(driver.id, String(req.params.id));

  if (trip.status !== 'STARTED') {
    throw new AppError('Only started trips can be ended', 400);
  }

  const { endOdometer, notes } = req.body;

  const distanceKm =
    endOdometer != null && trip.startOdometer != null ? endOdometer - trip.startOdometer : null;

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED',
        actualEndAt: new Date(),
        endOdometer: endOdometer ?? null,
        distanceKm,
        notes: notes !== undefined ? notes : trip.notes,
      },
    });

    await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'AVAILABLE' } });
    await tx.driver.update({ where: { id: driver.id }, data: { status: 'AVAILABLE' } });

    await tx.tripHistory.create({
      data: {
        tripId: trip.id,
        action: 'COMPLETED',
        fromStatus: 'STARTED',
        toStatus: 'COMPLETED',
        remarks: 'Trip completed by driver',
        metadata: { endOdometer, distanceKm } as any,
        createdById: userId,
      },
    });

    return t;
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.trip.end',
    entityType: 'Trip',
    entityId: trip.id,
    metadata: { driverId: driver.id, endOdometer, distanceKm },
  });

  return sendSuccess(res, updated, 'Trip completed');
}

export async function driverCancelTripController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;
  const trip = await assertDriverOwnsTrip(driver.id, String(req.params.id));

  if (trip.status === 'COMPLETED') {
    throw new AppError('Completed trips cannot be cancelled', 400);
  }
  if (trip.status === 'CANCELLED') {
    throw new AppError('Trip is already cancelled', 400);
  }

  const { notes } = req.body;

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.trip.update({
      where: { id: trip.id },
      data: { status: 'CANCELLED', notes: notes !== undefined ? notes : trip.notes },
    });

    if (trip.status === 'STARTED') {
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'AVAILABLE' } });
      await tx.driver.update({ where: { id: driver.id }, data: { status: 'AVAILABLE' } });
    }

    await tx.tripHistory.create({
      data: {
        tripId: trip.id,
        action: 'CANCELLED',
        fromStatus: trip.status,
        toStatus: 'CANCELLED',
        remarks: 'Trip cancelled by driver',
        createdById: userId,
      },
    });

    return t;
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.trip.cancel',
    entityType: 'Trip',
    entityId: trip.id,
    metadata: { fromStatus: trip.status, driverId: driver.id },
  });

  return sendSuccess(res, updated, 'Trip cancelled');
}

export async function driverCreateFuelController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  const { vehicleId, fuelDate, totalAmount, quantityLiters, odometerReading, stationName, receiptNumber, paymentMode, notes } = req.body;
  if (!vehicleId || !totalAmount) {
    throw new AppError('vehicleId and totalAmount are required', 400);
  }

  await assertDriverOwnsVehicle(driver.id, vehicleId);

  let pricePerLiter: number | null = null;
  if (quantityLiters && totalAmount) {
    pricePerLiter = Math.round((totalAmount / quantityLiters) * 100) / 100;
  }

  const entry = await prisma.fuelEntry.create({
    data: {
      vehicleId,
      driverId: driver.id,
      fuelDate: fuelDate ? new Date(fuelDate) : new Date(),
      fuelType: 'DIESEL',
      entryMode: 'QUICK_AMOUNT',
      totalAmount,
      quantityLiters: quantityLiters ?? null,
      pricePerLiter,
      odometerReading: odometerReading ?? null,
      stationName: stationName ?? null,
      receiptNumber: receiptNumber ?? null,
      paymentMode: paymentMode ?? null,
      notes: notes ?? null,
      status: 'DRAFT',
      createdById: userId,
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.fuel.create',
    entityType: 'FuelEntry',
    entityId: entry.id,
    metadata: { vehicleId, driverId: driver.id, totalAmount },
  });

  return sendSuccess(res, entry, 'Fuel entry created', 201);
}

export async function driverUploadFuelReceiptController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  if (!req.file) {
    throw new AppError('Receipt file is required', 400);
  }

  const { vehicleId, fuelDate, totalAmount, quantityLiters, stationName, paymentMode, notes } = req.body;

  const docNumber = generateDocNumber();
  const originalName = req.file.originalname;
  const storageKey = `driver-fuel-receipts/${driver.id}/${docNumber}-${originalName}`;

  const doc = await prisma.document.create({
    data: {
      documentNumber: docNumber,
      title: `Fuel Receipt - ${originalName}`,
      originalFileName: originalName,
      storedFileName: `${docNumber}-${originalName}`,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      storageKey,
      documentType: 'FUEL_BILL',
      documentCategory: 'FINANCE',
      vehicleId: vehicleId ?? null,
      driverId: driver.id,
      uploadedById: userId,
      documentStatus: 'ACTIVE',
      verificationStatus: 'PENDING',
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.fuel.receipt_upload',
    entityType: 'Document',
    entityId: doc.id,
    metadata: { driverId: driver.id, vehicleId, fileSize: req.file.size },
  });

  const extraction = await extractFromReceipt(storageKey, req.file.mimetype);

  return sendSuccess(res, { document: doc, extraction }, 'Receipt uploaded', 201);
}

export async function driverExtractFuelReceiptController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const { documentId } = req.body;

  if (!documentId) {
    throw new AppError('documentId is required', 400);
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.driverId !== driver.id) {
    throw new AppError('Document not found or does not belong to you', 404);
  }

  const extraction = await extractFromReceipt(doc.storageKey, doc.mimeType);

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'driver.fuel.receipt_extract',
    entityType: 'Document',
    entityId: documentId,
    metadata: { driverId: driver.id },
  });

  return sendSuccess(res, extraction, 'Extraction completed');
}

export async function driverCreateExpenseController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  const { vehicleId, tripId, category, amount, expenseDate, notes } = req.body;
  if (!vehicleId || !category || !amount) {
    throw new AppError('vehicleId, category, and amount are required', 400);
  }

  await assertDriverOwnsVehicle(driver.id, vehicleId);
  if (tripId) {
    await assertDriverOwnsTrip(driver.id, tripId);
  }

  const entry = await prisma.expense.create({
    data: {
      vehicleId,
      tripId: tripId ?? null,
      driverId: driver.id,
      category,
      amount,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: notes ?? null,
      status: 'DRAFT',
      createdById: userId,
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.expense.create',
    entityType: 'Expense',
    entityId: entry.id,
    metadata: { vehicleId, driverId: driver.id, category, amount },
  });

  return sendSuccess(res, entry, 'Expense created', 201);
}

export async function driverUploadExpenseReceiptController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  if (!req.file) {
    throw new AppError('Receipt file is required', 400);
  }

  const { expenseId, vehicleId, tripId, description } = req.body;

  if (expenseId) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense || expense.driverId !== driver.id) {
      throw new AppError('Expense not found or does not belong to you', 404);
    }
  }

  const docNumber = generateDocNumber();
  const originalName = req.file.originalname;
  const storageKey = `driver-expense-receipts/${driver.id}/${docNumber}-${originalName}`;

  const doc = await prisma.document.create({
    data: {
      documentNumber: docNumber,
      title: `Expense Receipt - ${originalName}`,
      originalFileName: originalName,
      storedFileName: `${docNumber}-${originalName}`,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      storageKey,
      documentType: 'GENERAL',
      documentCategory: 'FINANCE',
      vehicleId: vehicleId ?? null,
      tripId: tripId ?? null,
      driverId: driver.id,
      uploadedById: userId,
      documentStatus: 'ACTIVE',
      verificationStatus: 'PENDING',
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.expense.receipt_upload',
    entityType: 'Document',
    entityId: doc.id,
    metadata: { driverId: driver.id, expenseId: expenseId ?? null },
  });

  return sendSuccess(res, doc, 'Receipt uploaded', 201);
}

export async function driverUploadDocumentController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  const file = req.file;
  const { title, documentType, documentCategory, vehicleId, tripId, description } = file ? req.body : req.body;
  if (!title || !documentType || !documentCategory) {
    throw new AppError('title, documentType, and documentCategory are required', 400);
  }

  if (vehicleId) {
    await assertDriverOwnsVehicle(driver.id, vehicleId);
  }
  if (tripId) {
    await assertDriverOwnsTrip(driver.id, tripId);
  }

  const docNumber = generateDocNumber();

  const doc = await prisma.document.create({
    data: {
      documentNumber: docNumber,
      title,
      description: description ?? null,
      originalFileName: file ? file.originalname : `${docNumber}.placeholder`,
      storedFileName: file ? `${docNumber}-${file.originalname}` : `${docNumber}.placeholder`,
      mimeType: file ? file.mimetype : 'application/octet-stream',
      fileSizeBytes: file ? file.size : 0,
      storageKey: file ? `driver-uploads/${driver.id}/${docNumber}` : `driver-uploads/${docNumber}`,
      documentType: documentType as any,
      documentCategory: documentCategory as any,
      vehicleId: vehicleId ?? null,
      driverId: driver.id,
      tripId: tripId ?? null,
      uploadedById: userId,
      documentStatus: 'ACTIVE',
      verificationStatus: 'PENDING',
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.document.upload',
    entityType: 'Document',
    entityId: doc.id,
    metadata: { driverId: driver.id, documentType, documentCategory, fileSize: file?.size ?? 0 },
  });

  return sendSuccess(res, doc, 'Document uploaded', 201);
}

export async function driverReportVehicleIssueController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  const { vehicleId, tripId, title, description, severity } = req.body;
  if (!vehicleId || !title) {
    throw new AppError('vehicleId and title are required', 400);
  }

  await assertDriverOwnsVehicle(driver.id, vehicleId);
  if (tripId) {
    await assertDriverOwnsTrip(driver.id, tripId);
  }

  const issue = await prisma.vehicleIssue.create({
    data: {
      vehicleId,
      tripId: tripId ?? null,
      driverId: driver.id,
      title,
      description: description ?? null,
      severity: (severity || 'MEDIUM') as any,
      status: 'OPEN',
      createdById: userId,
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.vehicle.issue_report',
    entityType: 'VehicleIssue',
    entityId: issue.id,
    metadata: { vehicleId, driverId: driver.id, severity: issue.severity },
  });

  return sendSuccess(res, issue, 'Vehicle issue reported', 201);
}

export async function driverCreateVehicleInspectionController(req: Request, res: Response) {
  const driver = await getLinkedDriver(req.authUser!.id);
  const userId = req.authUser!.id;

  const { vehicleId, tripId, inspectionType, odometerReading, overallStatus, notes, checklistItems } = req.body;
  if (!vehicleId || !inspectionType) {
    throw new AppError('vehicleId and inspectionType are required', 400);
  }

  await assertDriverOwnsVehicle(driver.id, vehicleId);
  if (tripId) {
    await assertDriverOwnsTrip(driver.id, tripId);
  }

  const inspection = await prisma.vehicleInspection.create({
    data: {
      vehicleId,
      driverId: driver.id,
      tripId: tripId ?? null,
      inspectionType,
      odometerReading: odometerReading ?? null,
      overallStatus: overallStatus || 'OK',
      notes: notes ?? null,
      checklistItems: checklistItems ?? [],
      createdById: userId,
    },
  });

  await createAuditLog(req, {
    userId,
    action: 'driver.vehicle.inspection_create',
    entityType: 'VehicleInspection',
    entityId: inspection.id,
    metadata: { vehicleId, driverId: driver.id, inspectionType },
  });

  return sendSuccess(res, inspection, 'Vehicle inspection created', 201);
}
