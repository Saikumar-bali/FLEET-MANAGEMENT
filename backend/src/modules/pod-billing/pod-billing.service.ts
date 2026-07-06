import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { createAuditLog } from '../audit/audit.service';
import { uploadDocument } from '../documents/documents.service';
import { createNotification } from '../notifications/notifications.service';
import { getDriverIdForUser } from '../user-profile-links/user-profile-links.service';
import type { Request } from 'express';

function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `INV-${date}-${random}`;
}

function decimalFrom(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === '') return new Decimal(fallback);
  return new Decimal(value as number | string);
}

function appendNote(existing: string | null, note: string) {
  return [existing, note].filter(Boolean).join('\n');
}

async function linkedDriverUserIds(driverId: string) {
  const links = await prisma.userProfileLink.findMany({
    where: { profileType: 'DRIVER', profileId: driverId, status: 'ACTIVE' },
    select: { userId: true },
  });
  return links.map((link) => link.userId);
}

async function assertTripPod(documentId: string) {
  const pod = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      trip: {
        include: {
          vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
          driver: { select: { id: true, name: true, mobile: true } },
          billing: true,
        },
      },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  if (!pod || pod.documentStatus === 'DELETED') throw new AppError('POD document not found', 404);
  if (pod.documentType !== 'TRIP_POD' || !pod.tripId || !pod.trip) {
    throw new AppError('Selected document is not a trip POD', 400);
  }

  return pod;
}

async function autoCreateBillingForVerifiedPod(
  tripId: string,
  userId: string,
  input: { customerId?: string; ratePerKm?: unknown; freightAmount?: unknown; loadingCharges?: unknown; unloadingCharges?: unknown; tollCharges?: unknown; otherCharges?: unknown; notes?: string },
) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { vehicle: true, driver: true, billing: true },
  });

  if (!trip) throw new AppError('Trip not found', 404);
  if (trip.billing) return { billing: trip.billing, created: false };

  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new AppError('Customer not found', 404);
  }

  const distanceKm = new Decimal(trip.distanceKm ?? 0);
  const ratePerKm = decimalFrom(input.ratePerKm, 0);
  const freightAmount = input.freightAmount !== undefined ? decimalFrom(input.freightAmount) : distanceKm.mul(ratePerKm);
  const loadingCharges = decimalFrom(input.loadingCharges);
  const unloadingCharges = decimalFrom(input.unloadingCharges);
  const tollCharges = decimalFrom(input.tollCharges);
  const otherCharges = decimalFrom(input.otherCharges);
  const taxableAmount = freightAmount.plus(loadingCharges).plus(unloadingCharges).plus(tollCharges).plus(otherCharges);
  const totalAmount = taxableAmount;
  const netReceivable = totalAmount;

  const billing = await prisma.tripBilling.create({
    data: {
      tripId: trip.id,
      customerId: input.customerId || null,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      invoiceNumber: generateInvoiceNumber(),
      invoiceDate: new Date(),
      freightAmount,
      loadingCharges,
      unloadingCharges,
      tollCharges,
      otherCharges,
      taxableAmount,
      totalAmount,
      netReceivable,
      balanceAmount: netReceivable,
      paymentStatus: 'UNBILLED',
      notes: input.notes || 'Auto-created after POD verification. Pending finance approval.',
      createdById: userId,
      updatedById: userId,
    },
    include: { trip: true, customer: true, vehicle: true, driver: true },
  });

  await prisma.financeHistory.create({
    data: {
      entityType: 'TRIP_BILLING',
      entityId: billing.id,
      action: 'CREATED',
      remarks: 'Billing draft auto-created after POD verification',
      createdById: userId,
      newValues: { tripId: trip.id, source: 'POD_VERIFIED', totalAmount: totalAmount.toString() },
    },
  });

  return { billing, created: true };
}

export async function uploadTripPod(req: Request, tripId: string, file: Express.Multer.File | undefined, body: Record<string, unknown>) {
  if (!file) throw new AppError('POD file is required', 400);

  const userId = req.authUser!.id;
  const driverId = await getDriverIdForUser(userId);
  if (!driverId) throw new AppError('No linked driver profile found', 404);

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { vehicle: true } });
  if (!trip) throw new AppError('Trip not found', 404);
  if (trip.driverId !== driverId) throw new AppError('Trip does not belong to your driver profile', 403);
  if (trip.status !== 'COMPLETED') throw new AppError('POD can be uploaded only after trip is completed', 400);

  const existingVerified = await prisma.document.findFirst({
    where: { tripId, documentType: 'TRIP_POD', documentStatus: 'ACTIVE', verificationStatus: 'VERIFIED' },
  });
  if (existingVerified) throw new AppError('POD is already verified for this trip', 409);

  const existingPending = await prisma.document.findFirst({
    where: { tripId, documentType: 'TRIP_POD', documentStatus: 'ACTIVE', verificationStatus: 'PENDING' },
  });
  if (existingPending) throw new AppError('A POD is already pending verification for this trip', 409);

  const metadata = JSON.stringify({
    receiverName: body.receiverName || null,
    receiverMobile: body.receiverMobile || null,
    deliveryNotes: body.deliveryNotes || null,
    source: 'DRIVER_PORTAL_POD_UPLOAD',
  });

  const doc = await uploadDocument(file, {
    title: `POD - ${trip.tripNumber}`,
    description: String(body.deliveryNotes || `Proof of delivery for ${trip.tripNumber}`),
    documentType: 'TRIP_POD',
    documentCategory: 'TRIP',
    linkedEntityType: 'TRIP',
    linkedEntityId: trip.id,
    tripId: trip.id,
    vehicleId: trip.vehicleId,
    driverId,
    tags: 'pod,delivery-proof,driver-upload',
    metadata,
  }, userId);

  await createAuditLog(req, {
    userId,
    action: 'driver.trip.pod_upload',
    entityType: 'Document',
    entityId: doc.id,
    metadata: { tripId, driverId, tripNumber: trip.tripNumber },
  });

  await createNotification({
    title: 'POD submitted',
    message: `${trip.tripNumber} POD was uploaded and is ready for verification.`,
    category: 'POD',
    severity: 'INFO',
    actionUrl: '/finance/pod-chain',
    recipientPolicy: { type: 'ROLE', roleKeys: ['admin', 'manager', 'supervisor'] },
    createdById: userId,
  });

  return doc;
}

export async function listPodBillingChain(query: Record<string, unknown>) {
  const status = typeof query.status === 'string' ? query.status : undefined;
  const pods = await prisma.document.findMany({
    where: {
      documentType: 'TRIP_POD',
      documentStatus: 'ACTIVE',
      ...(status ? { verificationStatus: status as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      uploadedBy: { select: { id: true, name: true } },
      verifiedBy: { select: { id: true, name: true } },
      trip: {
        include: {
          vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
          driver: { select: { id: true, name: true, mobile: true } },
          billing: { include: { customer: true } },
        },
      },
    },
  });

  const pendingBillings = await prisma.tripBilling.findMany({
    where: { paymentStatus: 'UNBILLED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      trip: { include: { documents: { where: { documentType: 'TRIP_POD', documentStatus: 'ACTIVE' }, orderBy: { createdAt: 'desc' } } } },
      customer: true,
      vehicle: true,
      driver: true,
    },
  });

  return { pods, pendingBillings };
}

export async function verifyPod(req: Request, documentId: string, body: Record<string, unknown>) {
  const userId = req.authUser!.id;
  const pod = await assertTripPod(documentId);

  if (pod.verificationStatus === 'VERIFIED') {
    const existingBilling = pod.trip.billing;
    return { pod, billing: existingBilling, billingCreated: false };
  }

  const updatedPod = await prisma.document.update({
    where: { id: documentId },
    data: {
      verificationStatus: 'VERIFIED',
      verifiedById: userId,
      verifiedAt: new Date(),
      reviewComments: body.notes ? String(body.notes) : 'POD verified',
    },
    include: {
      trip: { include: { vehicle: true, driver: true, billing: true } },
      verifiedBy: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  const billingResult = await autoCreateBillingForVerifiedPod(pod.tripId!, userId, {
    customerId: body.customerId ? String(body.customerId) : undefined,
    ratePerKm: body.ratePerKm,
    freightAmount: body.freightAmount,
    loadingCharges: body.loadingCharges,
    unloadingCharges: body.unloadingCharges,
    tollCharges: body.tollCharges,
    otherCharges: body.otherCharges,
    notes: body.notes ? `Auto-created after POD verification. ${String(body.notes)}` : undefined,
  });

  await createAuditLog(req, {
    userId,
    action: 'pod.verify',
    entityType: 'Document',
    entityId: documentId,
    metadata: { tripId: pod.tripId, billingId: billingResult.billing.id, billingCreated: billingResult.created },
  });

  await createNotification({
    title: 'Billing approval pending',
    message: `${pod.trip.tripNumber} POD verified. Billing draft is ready for finance approval.`,
    category: 'BILLING',
    severity: 'INFO',
    actionUrl: '/finance/pod-chain',
    recipientPolicy: { type: 'ROLE', roleKeys: ['finance'] },
    createdById: userId,
  });

  return { pod: updatedPod, billing: billingResult.billing, billingCreated: billingResult.created };
}

export async function rejectPod(req: Request, documentId: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new AppError('Rejection reason is required', 400);
  const userId = req.authUser!.id;
  const pod = await assertTripPod(documentId);

  const updatedPod = await prisma.document.update({
    where: { id: documentId },
    data: {
      verificationStatus: 'REJECTED',
      verifiedById: userId,
      verifiedAt: new Date(),
      reviewComments: reason,
    },
    include: { trip: true },
  });

  await createAuditLog(req, {
    userId,
    action: 'pod.reject',
    entityType: 'Document',
    entityId: documentId,
    metadata: { tripId: pod.tripId, reason },
  });

  const driverUserIds = pod.trip.driverId ? await linkedDriverUserIds(pod.trip.driverId) : [];
  if (driverUserIds.length > 0) {
    await createNotification({
      title: 'POD rejected',
      message: `${pod.trip.tripNumber} POD was rejected: ${reason}`,
      category: 'POD',
      severity: 'WARNING',
      actionUrl: '/driver-portal/trips',
      recipientPolicy: { type: 'USER', userIds: driverUserIds },
      createdById: userId,
    });
  }

  return updatedPod;
}

export async function approveBilling(req: Request, billingId: string, notes?: string) {
  const userId = req.authUser!.id;
  const billing = await prisma.tripBilling.findUnique({
    where: { id: billingId },
    include: { trip: { include: { documents: true } }, customer: true, driver: true },
  });
  if (!billing) throw new AppError('Billing not found', 404);
  if (billing.paymentStatus === 'CANCELLED') throw new AppError('Rejected billing cannot be approved', 400);

  const hasVerifiedPod = billing.trip.documents.some((doc) => doc.documentType === 'TRIP_POD' && doc.verificationStatus === 'VERIFIED' && doc.documentStatus === 'ACTIVE');
  if (!hasVerifiedPod) throw new AppError('Verified POD is required before finance approval', 400);

  const updated = await prisma.tripBilling.update({
    where: { id: billingId },
    data: {
      paymentStatus: 'BILLED',
      notes: appendNote(billing.notes, notes ? `Finance approved: ${notes}` : 'Finance approved'),
      updatedById: userId,
    },
    include: { trip: true, customer: true, vehicle: true, driver: true },
  });

  await prisma.financeHistory.create({
    data: {
      entityType: 'TRIP_BILLING',
      entityId: billingId,
      action: 'STATUS_CHANGED',
      remarks: notes || 'Finance approved billing',
      createdById: userId,
      oldValues: { paymentStatus: billing.paymentStatus },
      newValues: { paymentStatus: 'BILLED' },
    },
  });

  await createNotification({
    title: 'Billing approved',
    message: `${billing.trip.tripNumber} billing was approved by finance.`,
    category: 'BILLING',
    severity: 'SUCCESS',
    actionUrl: '/finance/trip-billings',
    recipientPolicy: { type: 'ROLE', roleKeys: ['admin', 'manager'] },
    createdById: userId,
  });

  return updated;
}

export async function rejectBilling(req: Request, billingId: string, reason: string) {
  if (!reason || reason.trim().length < 3) throw new AppError('Rejection reason is required', 400);
  const userId = req.authUser!.id;
  const billing = await prisma.tripBilling.findUnique({ where: { id: billingId }, include: { trip: true } });
  if (!billing) throw new AppError('Billing not found', 404);
  if (billing.paymentStatus === 'BILLED' || billing.paidAmount.greaterThan(0)) {
    throw new AppError('Approved or paid billing cannot be rejected', 400);
  }

  const updated = await prisma.tripBilling.update({
    where: { id: billingId },
    data: {
      paymentStatus: 'CANCELLED',
      notes: appendNote(billing.notes, `Finance rejected: ${reason}`),
      updatedById: userId,
    },
    include: { trip: true, customer: true, vehicle: true, driver: true },
  });

  await prisma.financeHistory.create({
    data: {
      entityType: 'TRIP_BILLING',
      entityId: billingId,
      action: 'STATUS_CHANGED',
      remarks: reason,
      createdById: userId,
      oldValues: { paymentStatus: billing.paymentStatus },
      newValues: { paymentStatus: 'CANCELLED' },
    },
  });

  await createNotification({
    title: 'Billing rejected',
    message: `${billing.trip.tripNumber} billing was rejected: ${reason}`,
    category: 'BILLING',
    severity: 'WARNING',
    actionUrl: '/finance/pod-chain',
    recipientPolicy: { type: 'ROLE', roleKeys: ['admin', 'manager'] },
    createdById: userId,
  });

  return updated;
}
