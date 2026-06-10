import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission, requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  assignAssetController,
  createAssetCategoryController,
  createAssetController,
  getAssetController,
  listAssetAssignmentsController,
  listAssetCategoriesController,
  listAssetHistoryController,
  listAssetsController,
  markAssetDamagedController,
  markAssetLostController,
  returnAssetController,
  transferAssetController,
  updateAssetCategoryController,
  updateAssetController,
  updateAssetStatusController,
} from './assets.controller';
import {
  assetAssignmentBodySchema,
  assetCategoryIdParamsSchema,
  assetIdParamsSchema,
  assetQuerySchema,
  assetReturnBodySchema,
  assetStatusActionBodySchema,
  assetTransferBodySchema,
  createAssetCategorySchema,
  createAssetSchema,
  updateAssetCategorySchema,
  updateAssetSchema,
  updateAssetStatusSchema,
} from './assets.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

// Asset Categories
router.get('/categories', requireAnyPermission(['asset_view', 'settings_view']), asyncHandler(listAssetCategoriesController));
router.post(
  '/categories',
  requirePermission('asset_create'),
  validateRequest({ body: createAssetCategorySchema }),
  asyncHandler(createAssetCategoryController),
);
router.patch(
  '/categories/:id',
  requirePermission('asset_update'),
  validateRequest({ params: assetCategoryIdParamsSchema, body: updateAssetCategorySchema }),
  asyncHandler(updateAssetCategoryController),
);

// Asset actions and details
router.get(
  '/:id/assignments',
  requirePermission('asset_view'),
  validateRequest({ params: assetIdParamsSchema }),
  asyncHandler(listAssetAssignmentsController),
);
router.get(
  '/:id/history',
  requirePermission('asset_view'),
  validateRequest({ params: assetIdParamsSchema }),
  asyncHandler(listAssetHistoryController),
);
router.post(
  '/:id/assign',
  requirePermission('asset_assign'),
  validateRequest({ params: assetIdParamsSchema, body: assetAssignmentBodySchema }),
  asyncHandler(assignAssetController),
);
router.post(
  '/:id/return',
  requirePermission('asset_return'),
  validateRequest({ params: assetIdParamsSchema, body: assetReturnBodySchema }),
  asyncHandler(returnAssetController),
);
router.post(
  '/:id/transfer',
  requirePermission('asset_transfer'),
  validateRequest({ params: assetIdParamsSchema, body: assetTransferBodySchema }),
  asyncHandler(transferAssetController),
);
router.post(
  '/:id/mark-damaged',
  requirePermission('asset_mark_damaged'),
  validateRequest({ params: assetIdParamsSchema, body: assetStatusActionBodySchema }),
  asyncHandler(markAssetDamagedController),
);
router.post(
  '/:id/mark-lost',
  requirePermission('asset_mark_lost'),
  validateRequest({ params: assetIdParamsSchema, body: assetStatusActionBodySchema }),
  asyncHandler(markAssetLostController),
);

// Assets
router.get(
  '/',
  requirePermission('asset_view'),
  validateRequest({ query: assetQuerySchema }),
  asyncHandler(listAssetsController),
);
router.get(
  '/:id',
  requirePermission('asset_view'),
  validateRequest({ params: assetIdParamsSchema }),
  asyncHandler(getAssetController),
);
router.post(
  '/',
  requirePermission('asset_create'),
  validateRequest({ body: createAssetSchema }),
  asyncHandler(createAssetController),
);
router.patch(
  '/:id',
  requirePermission('asset_update'),
  validateRequest({ params: assetIdParamsSchema, body: updateAssetSchema }),
  asyncHandler(updateAssetController),
);
router.patch(
  '/:id/status',
  requireAnyPermission(['asset_update', 'asset_delete']),
  validateRequest({ params: assetIdParamsSchema, body: updateAssetStatusSchema }),
  asyncHandler(updateAssetStatusController),
);

export default router;
