import { Request, Response } from 'express';
import { AssetAssignmentHolderType } from '@prisma/client';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  assignAsset,
  createAsset,
  createAssetCategory,
  getAssetById,
  listAssetAssignments,
  listAssetCategories,
  listAssetHistory,
  listAssets,
  markAssetDamaged,
  markAssetLost,
  returnAsset,
  transferAsset,
  updateAsset,
  updateAssetCategory,
  updateAssetStatus,
} from './assets.service';

function holderMetadata(assignedToType: AssetAssignmentHolderType, assignedToId: string) {
  return {
    holderType: assignedToType,
    holderId: assignedToId,
  };
}

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
  const asset = await createAsset({
    ...req.body,
    createdById: req.authUser?.id,
  });

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
  const asset = await updateAsset(String(req.params.id), {
    ...req.body,
    updatedById: req.authUser?.id,
  });

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
  const asset = await updateAssetStatus({
    assetId: String(req.params.id),
    status: req.body.currentStatus,
    notes: req.body.notes,
    proofUrl: req.body.proofUrl,
    performedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.status_update',
    entityType: 'asset',
    entityId: asset.id,
    metadata: { status: asset.currentStatus },
  });

  return sendSuccess(res, asset, 'Asset status updated successfully');
}

export async function listAssetAssignmentsController(req: Request, res: Response) {
  const assignments = await listAssetAssignments(String(req.params.id));
  return sendSuccess(res, assignments);
}

export async function listAssetHistoryController(req: Request, res: Response) {
  const history = await listAssetHistory(String(req.params.id));
  return sendSuccess(res, history);
}

export async function assignAssetController(req: Request, res: Response) {
  const assignment = await assignAsset({
    assetId: String(req.params.id),
    assignedToType: req.body.assignedToType,
    assignedToId: req.body.assignedToId,
    notes: req.body.notes,
    assignedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.assign',
    entityType: 'asset',
    entityId: String(req.params.id),
    metadata: holderMetadata(req.body.assignedToType, req.body.assignedToId),
  });

  return sendSuccess(res, assignment, 'Asset assigned successfully', 201);
}

export async function returnAssetController(req: Request, res: Response) {
  const assignment = await returnAsset({
    assetId: String(req.params.id),
    notes: req.body.notes,
    proofUrl: req.body.proofUrl,
    performedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.return',
    entityType: 'asset',
    entityId: String(req.params.id),
    metadata: {
      previousHolderType: assignment.assignedToType,
      previousHolderId: assignment.assignedToId,
    },
  });

  return sendSuccess(res, assignment, 'Asset returned successfully');
}

export async function transferAssetController(req: Request, res: Response) {
  const assignment = await transferAsset({
    assetId: String(req.params.id),
    assignedToType: req.body.assignedToType,
    assignedToId: req.body.assignedToId,
    notes: req.body.notes,
    proofUrl: req.body.proofUrl,
    performedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.transfer',
    entityType: 'asset',
    entityId: String(req.params.id),
    metadata: holderMetadata(req.body.assignedToType, req.body.assignedToId),
  });

  return sendSuccess(res, assignment, 'Asset transferred successfully');
}

export async function markAssetDamagedController(req: Request, res: Response) {
  const asset = await markAssetDamaged({
    assetId: String(req.params.id),
    notes: req.body.notes,
    proofUrl: req.body.proofUrl,
    performedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.mark_damaged',
    entityType: 'asset',
    entityId: asset.id,
  });

  return sendSuccess(res, asset, 'Asset marked as damaged');
}

export async function markAssetLostController(req: Request, res: Response) {
  const asset = await markAssetLost({
    assetId: String(req.params.id),
    notes: req.body.notes,
    proofUrl: req.body.proofUrl,
    performedById: req.authUser?.id,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'asset.mark_lost',
    entityType: 'asset',
    entityId: asset.id,
  });

  return sendSuccess(res, asset, 'Asset marked as lost');
}
