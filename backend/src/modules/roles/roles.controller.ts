import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { assignRolePermissions, createRole, listRoles, updateRole } from './roles.service';

export async function listRolesController(_req: Request, res: Response) {
  const roles = await listRoles();
  return sendSuccess(res, roles);
}

export async function createRoleController(req: Request, res: Response) {
  const role = await createRole(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'role.create',
    entityType: 'role',
    entityId: role.id,
    metadata: { key: role.key },
  });

  return sendSuccess(res, role, 'Role created successfully', 201);
}

export async function updateRoleController(req: Request, res: Response) {
  const roleId = String(req.params.id);
  const role = await updateRole(roleId, req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'role.update',
    entityType: 'role',
    entityId: role.id,
    metadata: { key: role.key },
  });

  return sendSuccess(res, role, 'Role updated successfully');
}

export async function assignRolePermissionsController(req: Request, res: Response) {
  const roleId = String(req.params.id);
  const role = await assignRolePermissions(roleId, req.body.permissionKeys);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'role.assign_permissions',
    entityType: 'role',
    entityId: roleId,
    metadata: { permissionKeys: req.body.permissionKeys },
  });

  return sendSuccess(res, role, 'Role permissions updated successfully');
}
