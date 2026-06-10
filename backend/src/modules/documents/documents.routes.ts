import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createDocumentController,
  deleteDocumentController,
  listDocumentsController,
  updateDocumentController,
} from './documents.controller';
import {
  createDocumentSchema,
  documentIdParamsSchema,
  documentQuerySchema,
  updateDocumentSchema,
} from './documents.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('asset_view'),
  validateRequest({ query: documentQuerySchema }),
  asyncHandler(listDocumentsController),
);
router.post(
  '/',
  requirePermission('asset_update'),
  validateRequest({ body: createDocumentSchema }),
  asyncHandler(createDocumentController),
);
router.patch(
  '/:id',
  requirePermission('asset_update'),
  validateRequest({ params: documentIdParamsSchema, body: updateDocumentSchema }),
  asyncHandler(updateDocumentController),
);
router.delete(
  '/:id',
  requirePermission('asset_update'),
  validateRequest({ params: documentIdParamsSchema }),
  asyncHandler(deleteDocumentController),
);

export default router;
