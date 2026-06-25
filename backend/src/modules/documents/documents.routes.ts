import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listDocumentsController,
  getDocumentController,
  uploadDocumentController,
  updateDocumentController,
  verifyDocumentController,
  archiveDocumentController,
  deleteDocumentController,
  viewDocumentController,
  downloadDocumentController,
} from './documents.controller';
import {
  documentIdParamsSchema,
  documentQuerySchema,
  updateDocumentSchema,
  verifyDocumentSchema,
} from './documents.validators';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('documents_view'),
  validateRequest({ query: documentQuerySchema }),
  asyncHandler(listDocumentsController),
);

router.post(
  '/upload',
  requirePermission('documents_upload'),
  upload.single('file'),
  asyncHandler(uploadDocumentController),
);

router.get(
  '/:id',
  requirePermission('documents_view'),
  validateRequest({ params: documentIdParamsSchema }),
  asyncHandler(getDocumentController),
);

router.get(
  '/:id/view',
  requirePermission('documents_download'),
  validateRequest({ params: documentIdParamsSchema }),
  asyncHandler(viewDocumentController),
);

router.get(
  '/:id/download',
  requirePermission('documents_download'),
  validateRequest({ params: documentIdParamsSchema }),
  asyncHandler(downloadDocumentController),
);

router.put(
  '/:id',
  requirePermission('documents_update'),
  validateRequest({ params: documentIdParamsSchema, body: updateDocumentSchema }),
  asyncHandler(updateDocumentController),
);

router.post(
  '/:id/verify',
  requirePermission('documents_verify'),
  validateRequest({ params: documentIdParamsSchema, body: verifyDocumentSchema }),
  asyncHandler(verifyDocumentController),
);

router.post(
  '/:id/archive',
  requirePermission('documents_archive'),
  validateRequest({ params: documentIdParamsSchema }),
  asyncHandler(archiveDocumentController),
);

router.delete(
  '/:id',
  requirePermission('documents_delete'),
  validateRequest({ params: documentIdParamsSchema }),
  asyncHandler(deleteDocumentController),
);

export default router;
