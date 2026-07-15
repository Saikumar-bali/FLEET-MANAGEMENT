import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createProfileLink,
  getProfileLinkById,
  listProfileLinks,
  getUserProfileLinks,
  updateProfileLink,
  revokeProfileLink,
  deleteProfileLink,
  listAvailableDrivers,
  listAvailableUsers,
  listAvailableVendors,
  listAvailableCustomers,
} from './user-profile-links.service';
import { validateProfileLinkCreate } from './user-profile-links.scope-validation';
import type { ProfileType } from '@prisma/client';

export async function listProfileLinksController(req: Request, res: Response) {
  const result = await listProfileLinks(
    {
      userId: req.query.userId as string | undefined,
      profileType: req.query.profileType as ProfileType | undefined,
      profileId: req.query.profileId as string | undefined,
      status: req.query.status as 'ACTIVE' | 'INACTIVE' | 'REVOKED' | undefined,
    },
    Number(req.query.page) || 1,
    Number(req.query.limit) || 20,
  );
  return sendSuccess(res, result);
}

export async function getProfileLinkByIdController(req: Request, res: Response) {
  const link = await getProfileLinkById(String(req.params.id));
  return sendSuccess(res, link);
}

export async function getUserProfileLinksController(req: Request, res: Response) {
  const links = await getUserProfileLinks(
    String(req.params.userId),
    req.query.profileType as ProfileType | undefined,
  );
  return sendSuccess(res, links);
}

export async function createProfileLinkController(req: Request, res: Response) {
  const actorUserId = req.authUser!.id;
  const { userId, profileType, profileId } = req.body;

  await validateProfileLinkCreate(actorUserId, userId, profileType, profileId);

  const link = await createProfileLink(req.body, actorUserId);

  await createAuditLog(req, {
    userId: actorUserId,
    action: 'profile_link.create',
    entityType: 'user_profile_link',
    entityId: link.id,
    metadata: {
      targetUserId: link.userId,
      profileType: link.profileType,
      profileId: link.profileId,
      isPrimary: link.isPrimary,
    },
  });

  return sendSuccess(res, link, 'Profile link created', 201);
}

export async function updateProfileLinkController(req: Request, res: Response) {
  const link = await updateProfileLink(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'profile_link.update',
    entityType: 'user_profile_link',
    entityId: link.id,
    metadata: { status: link.status, isPrimary: link.isPrimary },
  });

  return sendSuccess(res, link, 'Profile link updated');
}

export async function revokeProfileLinkController(req: Request, res: Response) {
  const link = await revokeProfileLink(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'profile_link.revoke',
    entityType: 'user_profile_link',
    entityId: link.id,
    metadata: { targetUserId: link.userId, profileType: link.profileType },
  });

  return sendSuccess(res, link, 'Profile link revoked');
}

export async function deleteProfileLinkController(req: Request, res: Response) {
  await deleteProfileLink(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'profile_link.delete',
    entityType: 'user_profile_link',
    entityId: String(req.params.id),
  });

  return sendSuccess(res, null, 'Profile link deleted');
}

// ─── Available entities for linking ───

export async function listAvailableDriversController(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const showAll = req.query.showAll === 'true';
  const drivers = await listAvailableDrivers(search, showAll);
  return sendSuccess(res, drivers);
}

export async function listAvailableUsersController(req: Request, res: Response) {
  const profileType = String(req.query.profileType).toUpperCase() as ProfileType;
  const search = req.query.search as string | undefined;
  const users = await listAvailableUsers(profileType, search);
  return sendSuccess(res, users);
}

export async function listAvailableVendorsController(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const vendors = await listAvailableVendors(search);
  return sendSuccess(res, vendors);
}

export async function listAvailableCustomersController(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const customers = await listAvailableCustomers(search);
  return sendSuccess(res, customers);
}

export async function selfProfileLinksController(req: Request, res: Response) {
  const links = await getUserProfileLinks(
    req.authUser!.id,
    req.query.profileType as ProfileType | undefined,
  );
  return sendSuccess(res, links);
}

// ─── User-scoped admin endpoint ───

export async function createProfileLinkForUserController(req: Request, res: Response) {
  const targetUserId = String(req.params.userId);
  const actorUserId = req.authUser!.id;

  // Validate actor has scope to create this link
  await validateProfileLinkCreate(actorUserId, targetUserId, req.body.profileType, req.body.profileId);

  const link = await createProfileLink(
    { ...req.body, userId: targetUserId },
    actorUserId,
  );

  await createAuditLog(req, {
    userId: actorUserId,
    action: 'profile_link.admin_create',
    entityType: 'user_profile_link',
    entityId: link.id,
    metadata: {
      targetUserId: link.userId,
      profileType: link.profileType,
      profileId: link.profileId,
      isPrimary: link.isPrimary,
    },
  });

  return sendSuccess(res, link, 'Profile link created', 201);
}
