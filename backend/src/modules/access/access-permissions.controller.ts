import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { createAuditLog } from '../audit/audit.service';
import {
  setPermissionOverride,
  removePermissionOverride,
  listPermissionOverrides,
  grantDataScope,
  removeDataScope,
  listDataScopes,
} from './access-permissions.service';

export async function listPermissionOverridesController(req: Request, res: Response) {
  const id = req.params.id as string;
  const overrides = await listPermissionOverrides(id);
  res.json(overrides);
}

export async function setPermissionOverrideController(req: Request, res: Response) {
  const id = req.params.id as string;
  const { permissionId, effect, reason, expiresAt } = req.body;

  if (!permissionId || !effect) {
    throw new AppError('permissionId and effect are required', 400);
  }

  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!permission) {
    throw new AppError('Permission not found', 404);
  }

  const result = await setPermissionOverride(
    req.authUser!.id,
    id,
    permissionId,
    effect,
    reason,
    expiresAt ? new Date(expiresAt) : undefined,
  );

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'access.permission_override_set',
    entityType: 'user_permission_override',
    entityId: id,
    metadata: { permissionId, effect, reason },
  });

  res.json(result);
}

export async function removePermissionOverrideController(req: Request, res: Response) {
  const id = req.params.id as string;
  const permissionId = req.params.permissionId as string;

  await removePermissionOverride(req.authUser!.id, id, permissionId);

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'access.permission_override_removed',
    entityType: 'user_permission_override',
    entityId: id,
    metadata: { permissionId },
  });

  res.json({ success: true });
}

export async function listDataScopesController(req: Request, res: Response) {
  const id = req.params.id as string;
  const scopes = await listDataScopes(id);
  res.json(scopes);
}

export async function grantDataScopeController(req: Request, res: Response) {
  const id = req.params.id as string;
  const { scopeType, scopeId, accessLevel, reason, expiresAt } = req.body;

  if (!scopeType || !accessLevel) {
    throw new AppError('scopeType and accessLevel are required', 400);
  }

  const validScopeTypes = ['OWN', 'USER', 'DRIVER', 'VEHICLE', 'TRIP', 'ASSET', 'CUSTOMER', 'VENDOR', 'BRANCH', 'DEPARTMENT', 'FINANCE', 'GLOBAL'];
  const validAccessLevels = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'];

  if (!validScopeTypes.includes(scopeType)) {
    throw new AppError('Invalid scopeType', 400);
  }
  if (!validAccessLevels.includes(accessLevel)) {
    throw new AppError('Invalid accessLevel', 400);
  }

  const result = await grantDataScope(
    req.authUser!.id,
    id,
    scopeType,
    accessLevel,
    scopeId,
    reason,
    expiresAt ? new Date(expiresAt) : undefined,
  );

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'access.data_scope_granted',
    entityType: 'user_data_scope',
    entityId: result.id,
    metadata: { targetUserId: id, scopeType, scopeId, accessLevel },
  });

  res.json(result);
}

export async function removeDataScopeController(req: Request, res: Response) {
  const scopeId = req.params.scopeId as string;

  await removeDataScope(scopeId);

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'access.data_scope_removed',
    entityType: 'user_data_scope',
    entityId: scopeId,
  });

  res.json({ success: true });
}
