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
} from './user-profile-links.service';
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
  const link = await createProfileLink(req.body, req.authUser!.id);

  await createAuditLog(req, {
    userId: req.authUser!.id,
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

// ─── Self endpoints ───

export async function selfProfileLinksController(req: Request, res: Response) {
  const links = await getUserProfileLinks(
    req.authUser!.id,
    req.query.profileType as ProfileType | undefined,
  );
  return sendSuccess(res, links);
}

export async function createSelfProfileLinkController(req: Request, res: Response) {
  const link = await createProfileLink(
    { ...req.body, userId: req.authUser!.id },
    req.authUser!.id,
  );

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'profile_link.self_create',
    entityType: 'user_profile_link',
    entityId: link.id,
    metadata: {
      profileType: link.profileType,
      profileId: link.profileId,
      isPrimary: link.isPrimary,
    },
  });

  return sendSuccess(res, link, 'Profile link created', 201);
}
