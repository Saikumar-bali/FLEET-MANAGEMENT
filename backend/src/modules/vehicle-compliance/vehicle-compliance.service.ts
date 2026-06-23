import { Prisma, ComplianceType, ComplianceDocStatus, ComplianceHistoryAction } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

function logHistory(params: {
  vehicleId: string;
  complianceType: ComplianceType;
  entityType: string;
  entityId?: string;
  action: ComplianceHistoryAction;
  fromStatus?: string;
  toStatus?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  remarks?: string;
  createdById?: string;
}) {
  return prisma.vehicleComplianceHistory.create({
    data: {
      vehicleId: params.vehicleId,
      complianceType: params.complianceType,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      oldValues: params.oldValues as unknown as Prisma.InputJsonValue | undefined,
      newValues: params.newValues as unknown as Prisma.InputJsonValue | undefined,
      remarks: params.remarks,
      createdById: params.createdById,
    },
  });
}

// ─── Registration ───

export async function getRegistration(vehicleId: string) {
  return prisma.vehicleRegistrationDetail.findUnique({ where: { vehicleId } });
}

export async function upsertRegistration(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleRegistrationDetail.findUnique({ where: { vehicleId } });
  const data = {
    registrationNumber: input.registrationNumber as string | undefined,
    registrationDate: input.registrationDate ? new Date(input.registrationDate as string) : undefined,
    ownerName: input.ownerName as string | undefined,
    rtoCode: input.rtoCode as string | undefined,
    rtoName: input.rtoName as string | undefined,
    vehicleClass: input.vehicleClass as string | undefined,
    transportCategory: input.transportCategory as string | undefined,
    bodyType: input.bodyType as string | undefined,
    seatingCapacity: input.seatingCapacity as number | undefined,
    grossVehicleWeight: input.grossVehicleWeight as number | undefined,
    unladenWeight: input.unladenWeight as number | undefined,
    hypothecationName: input.hypothecationName as string | undefined,
    hypothecationType: input.hypothecationType as string | undefined,
  };

  const result = existing
    ? await prisma.vehicleRegistrationDetail.update({ where: { vehicleId }, data })
    : await prisma.vehicleRegistrationDetail.create({ data: { ...data, vehicleId } });

  await logHistory({
    vehicleId,
    complianceType: 'RC',
    entityType: 'VehicleRegistrationDetail',
    entityId: result.id,
    action: existing ? 'UPDATED' : 'CREATED',
    newValues: data as unknown as Record<string, unknown>,
    createdById: userId,
  });

  return result;
}

// ─── Insurance ───

export async function listInsurance(vehicleId: string) {
  return prisma.vehicleInsuranceDetail.findMany({ where: { vehicleId }, orderBy: { validTo: 'desc' } });
}

export async function getInsurance(id: string) {
  return prisma.vehicleInsuranceDetail.findUnique({ where: { id } });
}

export async function createInsurance(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const result = await prisma.vehicleInsuranceDetail.create({
    data: {
      vehicleId,
      policyNumber: input.policyNumber as string,
      insurerName: input.insurerName as string,
      policyType: input.policyType as any,
      validFrom: new Date(input.validFrom as string),
      validTo: new Date(input.validTo as string),
      premiumAmount: input.premiumAmount as number | undefined,
      idvAmount: input.idvAmount as number | undefined,
      renewalReminderDays: (input.renewalReminderDays as number) ?? 30,
      status: (input.status as ComplianceDocStatus) ?? 'ACTIVE',
    },
  });
  await logHistory({ vehicleId, complianceType: 'INSURANCE', entityType: 'VehicleInsuranceDetail', entityId: result.id, action: 'CREATED', newValues: input, createdById: userId });
  return result;
}

export async function updateInsurance(id: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleInsuranceDetail.findUnique({ where: { id } });
  if (!existing) throw new AppError('Insurance record not found', 404);
  const data: Record<string, unknown> = {};
  if (input.policyNumber !== undefined) data.policyNumber = input.policyNumber;
  if (input.insurerName !== undefined) data.insurerName = input.insurerName;
  if (input.policyType !== undefined) data.policyType = input.policyType;
  if (input.validFrom !== undefined) data.validFrom = new Date(input.validFrom as string);
  if (input.validTo !== undefined) data.validTo = new Date(input.validTo as string);
  if (input.premiumAmount !== undefined) data.premiumAmount = input.premiumAmount;
  if (input.idvAmount !== undefined) data.idvAmount = input.idvAmount;
  if (input.renewalReminderDays !== undefined) data.renewalReminderDays = input.renewalReminderDays;
  if (input.status !== undefined) data.status = input.status;
  const result = await prisma.vehicleInsuranceDetail.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: 'INSURANCE', entityType: 'VehicleInsuranceDetail', entityId: id, action: 'UPDATED', oldValues: existing as unknown as Record<string, unknown>, newValues: data, createdById: userId });
  return result;
}

// ─── Permit ───

export async function listPermits(vehicleId: string) {
  return prisma.vehiclePermitDetail.findMany({ where: { vehicleId }, orderBy: { validTo: 'desc' } });
}

export async function getPermit(id: string) {
  return prisma.vehiclePermitDetail.findUnique({ where: { id } });
}

export async function createPermit(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const result = await prisma.vehiclePermitDetail.create({
    data: {
      vehicleId,
      permitNumber: input.permitNumber as string,
      permitType: input.permitType as any,
      issuingAuthority: input.issuingAuthority as string | undefined,
      coveredStates: input.coveredStates as string | undefined,
      coveredRoutes: input.coveredRoutes as string | undefined,
      validFrom: new Date(input.validFrom as string),
      validTo: new Date(input.validTo as string),
      renewalReminderDays: (input.renewalReminderDays as number) ?? 30,
      status: (input.status as ComplianceDocStatus) ?? 'ACTIVE',
    },
  });
  await logHistory({ vehicleId, complianceType: 'PERMIT', entityType: 'VehiclePermitDetail', entityId: result.id, action: 'CREATED', newValues: input, createdById: userId });
  return result;
}

export async function updatePermit(id: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehiclePermitDetail.findUnique({ where: { id } });
  if (!existing) throw new AppError('Permit record not found', 404);
  const data: Record<string, unknown> = {};
  if (input.permitNumber !== undefined) data.permitNumber = input.permitNumber;
  if (input.permitType !== undefined) data.permitType = input.permitType;
  if (input.issuingAuthority !== undefined) data.issuingAuthority = input.issuingAuthority;
  if (input.coveredStates !== undefined) data.coveredStates = input.coveredStates;
  if (input.coveredRoutes !== undefined) data.coveredRoutes = input.coveredRoutes;
  if (input.validFrom !== undefined) data.validFrom = new Date(input.validFrom as string);
  if (input.validTo !== undefined) data.validTo = new Date(input.validTo as string);
  if (input.renewalReminderDays !== undefined) data.renewalReminderDays = input.renewalReminderDays;
  if (input.status !== undefined) data.status = input.status;
  const result = await prisma.vehiclePermitDetail.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: 'PERMIT', entityType: 'VehiclePermitDetail', entityId: id, action: 'UPDATED', oldValues: existing as unknown as Record<string, unknown>, newValues: data, createdById: userId });
  return result;
}

// ─── Fitness ───

export async function listFitness(vehicleId: string) {
  return prisma.vehicleFitnessDetail.findMany({ where: { vehicleId }, orderBy: { validTo: 'desc' } });
}

export async function getFitness(id: string) {
  return prisma.vehicleFitnessDetail.findUnique({ where: { id } });
}

export async function createFitness(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const result = await prisma.vehicleFitnessDetail.create({
    data: {
      vehicleId,
      certificateNumber: input.certificateNumber as string,
      inspectionDate: new Date(input.inspectionDate as string),
      validFrom: new Date(input.validFrom as string),
      validTo: new Date(input.validTo as string),
      inspectionCenter: input.inspectionCenter as string | undefined,
      remarks: input.remarks as string | undefined,
      renewalReminderDays: (input.renewalReminderDays as number) ?? 30,
      status: (input.status as ComplianceDocStatus) ?? 'ACTIVE',
    },
  });
  await logHistory({ vehicleId, complianceType: 'FITNESS', entityType: 'VehicleFitnessDetail', entityId: result.id, action: 'CREATED', newValues: input, createdById: userId });
  return result;
}

export async function updateFitness(id: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleFitnessDetail.findUnique({ where: { id } });
  if (!existing) throw new AppError('Fitness record not found', 404);
  const data: Record<string, unknown> = {};
  if (input.certificateNumber !== undefined) data.certificateNumber = input.certificateNumber;
  if (input.inspectionDate !== undefined) data.inspectionDate = new Date(input.inspectionDate as string);
  if (input.validFrom !== undefined) data.validFrom = new Date(input.validFrom as string);
  if (input.validTo !== undefined) data.validTo = new Date(input.validTo as string);
  if (input.inspectionCenter !== undefined) data.inspectionCenter = input.inspectionCenter;
  if (input.remarks !== undefined) data.remarks = input.remarks;
  if (input.renewalReminderDays !== undefined) data.renewalReminderDays = input.renewalReminderDays;
  if (input.status !== undefined) data.status = input.status;
  const result = await prisma.vehicleFitnessDetail.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: 'FITNESS', entityType: 'VehicleFitnessDetail', entityId: id, action: 'UPDATED', oldValues: existing as unknown as Record<string, unknown>, newValues: data, createdById: userId });
  return result;
}

// ─── PUC ───

export async function listPuc(vehicleId: string) {
  return prisma.vehiclePucDetail.findMany({ where: { vehicleId }, orderBy: { validTo: 'desc' } });
}

export async function getPuc(id: string) {
  return prisma.vehiclePucDetail.findUnique({ where: { id } });
}

export async function createPuc(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const result = await prisma.vehiclePucDetail.create({
    data: {
      vehicleId,
      certificateNumber: input.certificateNumber as string,
      emissionNorm: input.emissionNorm as any,
      testingCenter: input.testingCenter as string | undefined,
      validFrom: new Date(input.validFrom as string),
      validTo: new Date(input.validTo as string),
      renewalReminderDays: (input.renewalReminderDays as number) ?? 30,
      status: (input.status as ComplianceDocStatus) ?? 'ACTIVE',
    },
  });
  await logHistory({ vehicleId, complianceType: 'PUC', entityType: 'VehiclePucDetail', entityId: result.id, action: 'CREATED', newValues: input, createdById: userId });
  return result;
}

export async function updatePuc(id: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehiclePucDetail.findUnique({ where: { id } });
  if (!existing) throw new AppError('PUC record not found', 404);
  const data: Record<string, unknown> = {};
  if (input.certificateNumber !== undefined) data.certificateNumber = input.certificateNumber;
  if (input.emissionNorm !== undefined) data.emissionNorm = input.emissionNorm;
  if (input.testingCenter !== undefined) data.testingCenter = input.testingCenter;
  if (input.validFrom !== undefined) data.validFrom = new Date(input.validFrom as string);
  if (input.validTo !== undefined) data.validTo = new Date(input.validTo as string);
  if (input.renewalReminderDays !== undefined) data.renewalReminderDays = input.renewalReminderDays;
  if (input.status !== undefined) data.status = input.status;
  const result = await prisma.vehiclePucDetail.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: 'PUC', entityType: 'VehiclePucDetail', entityId: id, action: 'UPDATED', oldValues: existing as unknown as Record<string, unknown>, newValues: data, createdById: userId });
  return result;
}

// ─── Road Tax ───

export async function listRoadTax(vehicleId: string) {
  return prisma.vehicleRoadTaxDetail.findMany({ where: { vehicleId }, orderBy: { paidTo: 'desc' } });
}

export async function getRoadTax(id: string) {
  return prisma.vehicleRoadTaxDetail.findUnique({ where: { id } });
}

export async function createRoadTax(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const result = await prisma.vehicleRoadTaxDetail.create({
    data: {
      vehicleId,
      taxReceiptNumber: input.taxReceiptNumber as string,
      taxType: input.taxType as any,
      paidFrom: new Date(input.paidFrom as string),
      paidTo: new Date(input.paidTo as string),
      amount: input.amount as number | undefined,
      issuingState: input.issuingState as string | undefined,
      renewalReminderDays: (input.renewalReminderDays as number) ?? 30,
      status: (input.status as ComplianceDocStatus) ?? 'ACTIVE',
    },
  });
  await logHistory({ vehicleId, complianceType: 'ROAD_TAX', entityType: 'VehicleRoadTaxDetail', entityId: result.id, action: 'CREATED', newValues: input, createdById: userId });
  return result;
}

export async function updateRoadTax(id: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleRoadTaxDetail.findUnique({ where: { id } });
  if (!existing) throw new AppError('Road tax record not found', 404);
  const data: Record<string, unknown> = {};
  if (input.taxReceiptNumber !== undefined) data.taxReceiptNumber = input.taxReceiptNumber;
  if (input.taxType !== undefined) data.taxType = input.taxType;
  if (input.paidFrom !== undefined) data.paidFrom = new Date(input.paidFrom as string);
  if (input.paidTo !== undefined) data.paidTo = new Date(input.paidTo as string);
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.issuingState !== undefined) data.issuingState = input.issuingState;
  if (input.renewalReminderDays !== undefined) data.renewalReminderDays = input.renewalReminderDays;
  if (input.status !== undefined) data.status = input.status;
  const result = await prisma.vehicleRoadTaxDetail.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: 'ROAD_TAX', entityType: 'VehicleRoadTaxDetail', entityId: id, action: 'UPDATED', oldValues: existing as unknown as Record<string, unknown>, newValues: data, createdById: userId });
  return result;
}

// ─── FASTag ───

export async function getFastag(vehicleId: string) {
  return prisma.vehicleFastagDetail.findUnique({ where: { vehicleId } });
}

export async function upsertFastag(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleFastagDetail.findUnique({ where: { vehicleId } });
  const data = {
    fastagId: input.fastagId as string,
    issuerBank: input.issuerBank as string | undefined,
    linkedMobileMasked: input.linkedMobileMasked as string | undefined,
    status: input.status as any,
    lastRechargeDate: input.lastRechargeDate ? new Date(input.lastRechargeDate as string) : undefined,
    lastKnownBalance: input.lastKnownBalance as number | undefined,
    notes: input.notes as string | undefined,
  };
  const result = existing
    ? await prisma.vehicleFastagDetail.update({ where: { vehicleId }, data })
    : await prisma.vehicleFastagDetail.create({ data: { ...data, vehicleId } });
  await logHistory({ vehicleId, complianceType: 'FASTAG', entityType: 'VehicleFastagDetail', entityId: result.id, action: existing ? 'UPDATED' : 'CREATED', newValues: input, createdById: userId });
  return result;
}

// ─── GPS Device ───

export async function getGpsDevice(vehicleId: string) {
  return prisma.vehicleGpsDeviceDetail.findUnique({ where: { vehicleId } });
}

export async function upsertGpsDevice(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleGpsDeviceDetail.findUnique({ where: { vehicleId } });
  const data = {
    deviceId: input.deviceId as string,
    imei: input.imei as string | undefined,
    simNumberMasked: input.simNumberMasked as string | undefined,
    vendorName: input.vendorName as string | undefined,
    installedAt: input.installedAt ? new Date(input.installedAt as string) : undefined,
    ais140Certified: (input.ais140Certified as boolean) ?? false,
    certificateNumber: input.certificateNumber as string | undefined,
    status: input.status as any,
    notes: input.notes as string | undefined,
  };
  const result = existing
    ? await prisma.vehicleGpsDeviceDetail.update({ where: { vehicleId }, data })
    : await prisma.vehicleGpsDeviceDetail.create({ data: { ...data, vehicleId } });
  await logHistory({ vehicleId, complianceType: 'GPS_AIS140', entityType: 'VehicleGpsDeviceDetail', entityId: result.id, action: existing ? 'UPDATED' : 'CREATED', newValues: input, createdById: userId });
  return result;
}

// ─── Compliance Documents ───

export async function listComplianceDocuments(query: any) {
  const where: Prisma.VehicleComplianceDocumentWhereInput = {};
  if (query.vehicleId) where.vehicleId = query.vehicleId;
  if (query.complianceType) where.complianceType = query.complianceType;
  if (query.status) where.status = query.status;
  if (query.expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + query.expiringWithinDays);
    where.validTo = { lte: futureDate, gte: new Date() };
  }
  const [items, total] = await Promise.all([
    prisma.vehicleComplianceDocument.findMany({ where, include: { verifiedBy: { select: { id: true, name: true } }, vehicle: { select: { id: true, vehicleNumber: true } } }, orderBy: { validTo: 'asc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.vehicleComplianceDocument.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getComplianceDocument(id: string) {
  return prisma.vehicleComplianceDocument.findUnique({ where: { id }, include: { verifiedBy: { select: { id: true, name: true } }, vehicle: { select: { id: true, vehicleNumber: true } } } });
}

export async function createComplianceDocument(vehicleId: string, input: Record<string, unknown>, userId?: string) {
  const result = await prisma.vehicleComplianceDocument.create({
    data: {
      vehicleId,
      complianceType: input.complianceType as any,
      documentNumber: input.documentNumber as string | undefined,
      validFrom: input.validFrom ? new Date(input.validFrom as string) : undefined,
      validTo: input.validTo ? new Date(input.validTo as string) : undefined,
      issuingAuthority: input.issuingAuthority as string | undefined,
      externalFileUrl: input.externalFileUrl as string | undefined,
      fileName: input.fileName as string | undefined,
      mimeType: input.mimeType as string | undefined,
      sizeBytes: input.sizeBytes as number | undefined,
      notes: input.notes as string | undefined,
    },
  });
  await logHistory({ vehicleId, complianceType: input.complianceType as ComplianceType, entityType: 'VehicleComplianceDocument', entityId: result.id, action: 'CREATED', newValues: input, createdById: userId });
  return result;
}

export async function updateComplianceDocument(id: string, input: Record<string, unknown>, userId?: string) {
  const existing = await prisma.vehicleComplianceDocument.findUnique({ where: { id } });
  if (!existing) throw new AppError('Compliance document not found', 404);
  const data: Record<string, unknown> = {};
  if (input.complianceType !== undefined) data.complianceType = input.complianceType;
  if (input.documentNumber !== undefined) data.documentNumber = input.documentNumber;
  if (input.validFrom !== undefined) data.validFrom = input.validFrom ? new Date(input.validFrom as string) : null;
  if (input.validTo !== undefined) data.validTo = input.validTo ? new Date(input.validTo as string) : null;
  if (input.issuingAuthority !== undefined) data.issuingAuthority = input.issuingAuthority;
  if (input.externalFileUrl !== undefined) data.externalFileUrl = input.externalFileUrl;
  if (input.fileName !== undefined) data.fileName = input.fileName;
  if (input.mimeType !== undefined) data.mimeType = input.mimeType;
  if (input.sizeBytes !== undefined) data.sizeBytes = input.sizeBytes;
  if (input.status !== undefined) data.status = input.status;
  if (input.notes !== undefined) data.notes = input.notes;
  const result = await prisma.vehicleComplianceDocument.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: existing.complianceType, entityType: 'VehicleComplianceDocument', entityId: id, action: 'UPDATED', oldValues: existing as unknown as Record<string, unknown>, newValues: data, createdById: userId });
  return result;
}

export async function verifyComplianceDocument(id: string, status: 'VERIFIED' | 'REJECTED', notes: string | undefined, userId: string) {
  const existing = await prisma.vehicleComplianceDocument.findUnique({ where: { id } });
  if (!existing) throw new AppError('Compliance document not found', 404);
  const result = await prisma.vehicleComplianceDocument.update({
    where: { id },
    data: { status, verifiedById: userId, verifiedAt: new Date(), notes: notes ?? existing.notes },
  });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: existing.complianceType, entityType: 'VehicleComplianceDocument', entityId: id, action: 'VERIFIED', fromStatus: existing.status, toStatus: status, remarks: notes, createdById: userId });
  return result;
}

export async function renewComplianceDocument(id: string, input: Record<string, unknown>, userId: string) {
  const existing = await prisma.vehicleComplianceDocument.findUnique({ where: { id } });
  if (!existing) throw new AppError('Compliance document not found', 404);
  const data: Record<string, unknown> = {
    validFrom: new Date(input.validFrom as string),
    validTo: new Date(input.validTo as string),
    status: 'ACTIVE',
  };
  if (input.documentNumber !== undefined) data.documentNumber = input.documentNumber;
  if (input.notes !== undefined) data.notes = input.notes;
  const result = await prisma.vehicleComplianceDocument.update({ where: { id }, data });
  await logHistory({ vehicleId: existing.vehicleId, complianceType: existing.complianceType, entityType: 'VehicleComplianceDocument', entityId: id, action: 'RENEWED', fromStatus: existing.status, toStatus: 'ACTIVE', oldValues: { validFrom: existing.validFrom, validTo: existing.validTo } as unknown as Record<string, unknown>, newValues: { validFrom: data.validFrom, validTo: data.validTo } as unknown as Record<string, unknown>, remarks: input.notes as string | undefined, createdById: userId });
  return result;
}

// ─── History ───

export async function listComplianceHistory(vehicleId: string, query: any) {
  const where: Prisma.VehicleComplianceHistoryWhereInput = { vehicleId };
  if (query.complianceType) where.complianceType = query.complianceType;
  if (query.action) where.action = query.action;
  const [items, total] = await Promise.all([
    prisma.vehicleComplianceHistory.findMany({ where, include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.vehicleComplianceHistory.count({ where }),
  ]);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

// ─── Dashboard / Alerts ───

export async function getComplianceDashboard() {
  const now = new Date();
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const [expired, expiring7Days, expiring30Days, pendingVerification, totalDocuments] = await Promise.all([
    prisma.vehicleComplianceDocument.count({ where: { status: 'ACTIVE', validTo: { lt: now } } }),
    prisma.vehicleComplianceDocument.count({ where: { status: 'ACTIVE', validTo: { gte: now, lte: in7Days } } }),
    prisma.vehicleComplianceDocument.count({ where: { status: 'ACTIVE', validTo: { gte: now, lte: in30Days } } }),
    prisma.vehicleComplianceDocument.count({ where: { status: 'DRAFT' } }),
    prisma.vehicleComplianceDocument.count(),
  ]);

  return {
    expired,
    expiring7Days,
    expiring30Days,
    pendingVerification,
    totalDocuments,
    label: 'Document compliance counts — tracks compliance documents (RC, insurance, permit, fitness, PUC, road tax, FASTag, GPS). Structured model counts (per-vehicle insurance/permit/etc.) are tracked separately.',
  };
}

export async function listExpiringSoon(days: number = 30) {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);
  return prisma.vehicleComplianceDocument.findMany({
    where: { status: 'ACTIVE', validTo: { gte: now, lte: futureDate } },
    include: { vehicle: { select: { id: true, vehicleNumber: true } } },
    orderBy: { validTo: 'asc' },
  });
}

export async function listExpired() {
  const now = new Date();
  return prisma.vehicleComplianceDocument.findMany({
    where: { status: 'ACTIVE', validTo: { lt: now } },
    include: { vehicle: { select: { id: true, vehicleNumber: true } } },
    orderBy: { validTo: 'asc' },
  });
}
