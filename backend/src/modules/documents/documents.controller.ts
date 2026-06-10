import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createDocument,
  deleteDocument,
  listDocuments,
  updateDocument,
} from './documents.service';

export async function listDocumentsController(req: Request, res: Response) {
  const result = await listDocuments({
    entityType: req.query.entityType as string | undefined,
    entityId: req.query.entityId as string | undefined,
    documentType: req.query.documentType as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });
  return sendSuccess(res, result);
}

export async function createDocumentController(req: Request, res: Response) {
  const document = await createDocument({
    ...req.body,
    uploadedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.create',
    entityType: 'document',
    entityId: document.id,
    metadata: { entityType: document.entityType, entityId: document.entityId, documentType: document.documentType },
  });

  return sendSuccess(res, document, 'Document created successfully', 201);
}

export async function updateDocumentController(req: Request, res: Response) {
  const document = await updateDocument(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.update',
    entityType: 'document',
    entityId: document.id,
    metadata: { entityType: document.entityType, entityId: document.entityId },
  });

  return sendSuccess(res, document, 'Document updated successfully');
}

export async function deleteDocumentController(req: Request, res: Response) {
  const document = await deleteDocument(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'document.delete',
    entityType: 'document',
    entityId: document.id,
    metadata: { entityType: document.entityType, entityId: document.entityId },
  });

  return sendSuccess(res, document, 'Document deleted successfully');
}
