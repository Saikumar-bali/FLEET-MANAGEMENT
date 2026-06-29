import { Request, Response } from 'express';
import { AppError } from '../../utils/appError';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import {
  setPermissionOverride,
  removePermissionOverride,
  listPermissionOverrides,
  grantDataScope,
  removeDataScope,
  listDataScopes,
} from './access-permissions.service';
import { getEffectivePermissions } from './effective-permissions.service';

export async function effectivePermissionsController(req: Request, res: Response) {
  const userId = req.params.id as string || req.authUser!.id;
  const result = await getEffectivePermissions(userId);
  sendSuccess(res, result);
}

export async function listPermissionOverridesController(req: Request, res: Response) {
  const id = req.params.id as string;
  const overrides = await listPermissionOverrides(id);
  sendSuccess(res, overrides);
}

export async function setPermissionOverrideController(req: Request, res: Response) {
  const id = req.params.id as string;
  const { permissionId, permissionKey, effect, reason, expiresAt } = req.body;

  if (!permissionKey && !permissionId) {
    throw new AppError('permissionKey or permissionId is required', 400);
  }

  if (!effect || !['ALLOW', 'DENY'].includes(effect)) {
    throw new AppError('effect must be ALLOW or DENY', 400);
  }

  let resolvedKey: string;
  if (permissionId) {
    const perm = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!perm) {
      throw new AppError('Permission not found', 404);
    }
    if (permissionKey && perm.key !== permissionKey) {
      throw new AppError('permissionId and permissionKey do not match', 400);
    }
    resolvedKey = perm.key;
  } else {
    resolvedKey = permissionKey;
  }

  const result = await setPermissionOverride(
    req.authUser!.id,
    id,
    resolvedKey,
    effect,
    reason,
    expiresAt ? new Date(expiresAt) : undefined,
  );

  sendSuccess(res, result, 'Permission override set');
}

export async function removePermissionOverrideController(req: Request, res: Response) {
  const id = req.params.id as string;
  const permissionId = req.params.permissionId as string;

  await removePermissionOverride(req.authUser!.id, id, permissionId);
  sendSuccess(res, null, 'Permission override removed');
}

export async function listDataScopesController(req: Request, res: Response) {
  const id = req.params.id as string;
  const scopes = await listDataScopes(id);
  sendSuccess(res, scopes);
}

export async function grantDataScopeController(req: Request, res: Response) {
  const id = req.params.id as string;
  const { scopeType, scopeId, accessLevel, reason, expiresAt } = req.body;

  if (!scopeType || !accessLevel) {
    throw new AppError('scopeType and accessLevel are required', 400);
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

  sendSuccess(res, result, 'Data scope granted');
}

export async function removeDataScopeController(req: Request, res: Response) {
  const scopeId = req.params.scopeId as string;

  await removeDataScope(req.authUser!.id, scopeId);
  sendSuccess(res, null, 'Data scope removed');
}
