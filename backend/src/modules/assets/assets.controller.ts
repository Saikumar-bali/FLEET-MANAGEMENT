import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createAsset,
  createAssetCategory,
  getAssetById,
  listAssetCategories,
  listAssets,
  updateAsset,
  updateAssetCategory,
  updateAssetStatus,
} from './assets.service';

// Asset Categories
export async function listAssetCategoriesController(_req: Request, res: Response) {
  const categories = await listAssetCategories();
  return sendSuccess(res, categories);
}

export async function createAssetCategoryController(req: Request, res: Response) {
  const category = await createAssetCategory(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset_category.create',
    entityType: 'asset_category',
    entityId: category.id,
    metadata: { key: category.key },
  });

  return sendSuccess(res, category, 'Asset category created successfully', 201);
}

export async function updateAssetCategoryController(req: Request, res: Response) {
  const category = await updateAssetCategory(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset_category.update',
    entityType: 'asset_category',
    entityId: category.id,
    metadata: { key: category.key },
  });

  return sendSuccess(res, category, 'Asset category updated successfully');
}

// Assets
export async function listAssetsController(req: Request, res: Response) {
  const result = await listAssets({
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  return sendSuccess(res, result);
}

export async function getAssetController(req: Request, res: Response) {
  const asset = await getAssetById(String(req.params.id));
  return sendSuccess(res, asset);
}

export async function createAssetController(req: Request, res: Response) {
  const asset = await createAsset(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.create',
    entityType: 'asset',
    entityId: asset.id,
    metadata: { assetCode: asset.assetCode },
  });

  return sendSuccess(res, asset, 'Asset created successfully', 201);
}

export async function updateAssetController(req: Request, res: Response) {
  const asset = await updateAsset(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.update',
    entityType: 'asset',
    entityId: asset.id,
    metadata: { assetCode: asset.assetCode },
  });

  return sendSuccess(res, asset, 'Asset updated successfully');
}

export async function updateAssetStatusController(req: Request, res: Response) {
  const asset = await updateAssetStatus(String(req.params.id), req.body.currentStatus);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.status_update',
    entityType: 'asset',
    entityId: asset.id,
    metadata: { status: asset.currentStatus },
  });

  return sendSuccess(res, asset, 'Asset status updated successfully');
}
