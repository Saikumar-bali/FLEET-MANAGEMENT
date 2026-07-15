import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { getActorContext } from '../access/actor-context.service';
import { getScopedWhereForResource, assertCanReadResource, assertCanCreateResource, assertCanUpdateResource, assertCanDeleteResource, assertCanChangeResourceScope } from '../access/scoped-enforcement.service';
import type { ResourceType } from '../access/resource-scope-map';
import {
  listDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  verifyDocument,
  archiveDocument,
  deleteDocument,
  getDocumentFileStream,
} from './documents.service';
import type { DocumentListQuery, DocumentUploadInput, DocumentUpdateInput } from './documents.types';

const RESOURCE: ResourceType = 'DOCUMENT';

export async function listDocumentsController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const scopedWhere = getScopedWhereForResource(actor, RESOURCE);

  const query: DocumentListQuery = {
    search: req.query.search as string,
    documentType: req.query.documentType as string,
    documentCategory: req.query.documentCategory as string,
    linkedEntityType: req.query.linkedEntityType as string,
    linkedEntityId: req.query.linkedEntityId as string,
    vehicleId: req.query.vehicleId as string,
    driverId: req.query.driverId as string,
    tripId: req.query.tripId as string,
    customerId: req.query.customerId as string,
    vendorId: req.query.vendorId as string,
    fuelEntryId: req.query.fuelEntryId as string,
    staffProfileId: req.query.staffProfileId as string,
    status: req.query.status as string,
    verificationStatus: req.query.verificationStatus as string,
    expiringBefore: req.query.expiringBefore as string,
    uploadedById: req.query.uploadedById as string,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    sort: req.query.sort as string,
    order: req.query.order as string,
    extraWhere: scopedWhere as Record<string, unknown> | undefined,
  };
  const result = await listDocuments(query);
  return sendSuccess(res, result);
}

export async function getDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const doc = await getDocumentById(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, doc as unknown as Record<string, unknown>);
  return sendSuccess(res, doc);
}

export async function uploadDocumentController(req: Request, res: Response) {
  if (!req.file) {
    return sendSuccess(res, null, 'No file provided', 400);
  }

  const actor = await getActorContext(req.authUser!.id);
  assertCanCreateResource(actor, RESOURCE, req.body);

  const input: DocumentUploadInput = {
    title: req.body.title,
    description: req.body.description,
    documentType: req.body.documentType,
    documentCategory: req.body.documentCategory,
    linkedEntityType: req.body.linkedEntityType,
    linkedEntityId: req.body.linkedEntityId,
    vehicleId: req.body.vehicleId,
    driverId: req.body.driverId,
    tripId: req.body.tripId,
    customerId: req.body.customerId,
    vendorId: req.body.vendorId,
    financeTransactionId: req.body.financeTransactionId,
    tripBillingId: req.body.tripBillingId,
    maintenanceRequestId: req.body.maintenanceRequestId,
    repairId: req.body.repairId,
    fuelEntryId: req.body.fuelEntryId,
    staffProfileId: req.body.staffProfileId,
    issueDate: req.body.issueDate,
    expiryDate: req.body.expiryDate,
    tags: req.body.tags,
    metadata: req.body.metadata,
  };

  const doc = await uploadDocument(req.file, input, req.authUser!.id);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.upload',
    entityType: 'document',
    entityId: doc.id,
    metadata: {
      documentType: doc.documentType,
      documentCategory: doc.documentCategory,
      originalFileName: doc.originalFileName,
      fileSizeBytes: doc.fileSizeBytes,
    },
  });

  return sendSuccess(res, doc, 'Document uploaded successfully', 201);
}

export async function updateDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);
  await assertCanChangeResourceScope(actor, RESOURCE, existing as unknown as Record<string, unknown>, req.body);

  const input: DocumentUpdateInput = {
    title: req.body.title,
    description: req.body.description,
    documentType: req.body.documentType,
    documentCategory: req.body.documentCategory,
    linkedEntityType: req.body.linkedEntityType,
    linkedEntityId: req.body.linkedEntityId,
    vehicleId: req.body.vehicleId,
    driverId: req.body.driverId,
    tripId: req.body.tripId,
    customerId: req.body.customerId,
    vendorId: req.body.vendorId,
    fuelEntryId: req.body.fuelEntryId,
    staffProfileId: req.body.staffProfileId,
    issueDate: req.body.issueDate,
    expiryDate: req.body.expiryDate,
    tags: req.body.tags,
    metadata: req.body.metadata,
  };

  const doc = await updateDocument(String(req.params.id), input);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.update',
    entityType: 'document',
    entityId: doc.id,
    metadata: { documentType: doc.documentType, documentCategory: doc.documentCategory },
  });

  return sendSuccess(res, doc, 'Document updated successfully');
}

export async function verifyDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const doc = await verifyDocument(
    String(req.params.id),
    req.body.verificationStatus,
    req.authUser!.id,
    req.body.notes,
  );

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.verify',
    entityType: 'document',
    entityId: doc.id,
    metadata: { verificationStatus: req.body.verificationStatus },
  });

  return sendSuccess(res, doc, 'Document verified successfully');
}

export async function archiveDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentById(String(req.params.id));
  assertCanUpdateResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const doc = await archiveDocument(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.archive',
    entityType: 'document',
    entityId: doc.id,
  });

  return sendSuccess(res, doc, 'Document archived successfully');
}

export async function deleteDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentById(String(req.params.id));
  assertCanDeleteResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const doc = await deleteDocument(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.delete',
    entityType: 'document',
    entityId: doc.id,
  });

  return sendSuccess(res, doc, 'Document deleted successfully');
}

export async function viewDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentById(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const result = await getDocumentFileStream(String(req.params.id));

  if ('url' in result) {
    return sendSuccess(res, { url: result.url, document: result.doc });
  }

  const { stream, doc } = result;
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Length', doc.fileSizeBytes);
  stream.pipe(res);
}

export async function downloadDocumentController(req: Request, res: Response) {
  const actor = await getActorContext(req.authUser!.id);
  const existing = await getDocumentById(String(req.params.id));
  assertCanReadResource(actor, RESOURCE, existing as unknown as Record<string, unknown>);

  const result = await getDocumentFileStream(String(req.params.id));

  if ('url' in result) {
    return sendSuccess(res, { url: result.url, document: result.doc });
  }

  const { stream, doc } = result;
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFileName}"`);
  res.setHeader('Content-Length', doc.fileSizeBytes);
  stream.pipe(res);
}
