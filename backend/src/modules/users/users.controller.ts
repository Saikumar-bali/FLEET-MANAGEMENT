import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
  updateUserPassword,
  updateUserStatus,
} from './users.service';

export async function listUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  return sendSuccess(res, users);
}

export async function getUserController(req: Request, res: Response) {
  const user = await getUserById(String(req.params.id));
  return sendSuccess(res, user);
}

export async function createUserController(req: Request, res: Response) {
  const user = await createUser(req.body);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.create',
    entityType: 'user',
    entityId: user.id,
    metadata: { username: user.username, email: user.email, roleId: user.role.id },
  });

  return sendSuccess(res, user, 'User created successfully', 201);
}

export async function updateUserController(req: Request, res: Response) {
  const user = await updateUser({
    userId: String(req.params.id),
    currentUserId: req.authUser!.id,
    input: req.body,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update',
    entityType: 'user',
    entityId: user.id,
    metadata: { username: user.username, email: user.email, roleId: user.role.id, status: user.status },
  });

  return sendSuccess(res, user, 'User updated successfully');
}

export async function updateUserStatusController(req: Request, res: Response) {
  const user = await updateUserStatus({
    userId: String(req.params.id),
    currentUserId: req.authUser!.id,
    status: req.body.status,
  });

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update_status',
    entityType: 'user',
    entityId: user.id,
    metadata: { status: user.status },
  });

  return sendSuccess(res, user, 'User status updated successfully');
}

export async function deleteUserController(req: Request, res: Response) {
  await deleteUser(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.delete',
    entityType: 'user',
    entityId: String(req.params.id),
  });

  return sendSuccess(res, null, 'User deleted successfully');
}

export async function updateUserPasswordController(req: Request, res: Response) {
  const result = await updateUserPassword(String(req.params.id), req.body.password);

  await createAuditLog(req, {
    userId: req.authUser?.id,
    action: 'user.update_password',
    entityType: 'user',
    entityId: result.id,
  });

  return sendSuccess(res, result, 'User password updated successfully');
}
