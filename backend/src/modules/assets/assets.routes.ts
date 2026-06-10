import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createAssetCategoryController,
  createAssetController,
  getAssetController,
  listAssetCategoriesController,
  listAssetsController,
  updateAssetCategoryController,
  updateAssetController,
  updateAssetStatusController,
} from './assets.controller';
import {
  assetCategoryIdParamsSchema,
  assetIdParamsSchema,
  assetQuerySchema,
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
