import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import {
  createStaffProfile,
  getStaffProfileById,
  listStaffProfiles,
  updateStaffProfile,
  deleteStaffProfile,
  listAvailableStaffProfiles,
} from './staff-profiles.service';
import type { StaffProfileFilter } from './staff-profiles.types';

export async function createStaffProfileController(req: Request, res: Response) {
  const profile = await createStaffProfile(req.body);

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'staff_profile.create',
    entityType: 'staff_profile',
    entityId: profile.id,
    metadata: { profileType: profile.profileType, name: profile.name },
  });

  return sendSuccess(res, profile, 'Staff profile created', 201);
}

export async function getStaffProfileByIdController(req: Request, res: Response) {
  const profile = await getStaffProfileById(String(req.params.id));
  return sendSuccess(res, profile);
}

export async function listStaffProfilesController(req: Request, res: Response) {
  const filters: StaffProfileFilter = {
    profileType: req.query.profileType as string | undefined,
    search: req.query.search as string | undefined,
    status: req.query.status as any,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  };
  const result = await listStaffProfiles(filters);
  return sendSuccess(res, result);
}

export async function updateStaffProfileController(req: Request, res: Response) {
  const profile = await updateStaffProfile(String(req.params.id), req.body);

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'staff_profile.update',
    entityType: 'staff_profile',
    entityId: profile.id,
    metadata: { profileType: profile.profileType, name: profile.name },
  });

  return sendSuccess(res, profile, 'Staff profile updated');
}

export async function deleteStaffProfileController(req: Request, res: Response) {
  await deleteStaffProfile(String(req.params.id));

  await createAuditLog(req, {
    userId: req.authUser!.id,
    action: 'staff_profile.delete',
    entityType: 'staff_profile',
    entityId: String(req.params.id),
  });

  return sendSuccess(res, null, 'Staff profile deleted');
}

export async function listAvailableStaffProfilesController(req: Request, res: Response) {
  const profileType = String(req.query.profileType).toUpperCase();
  const search = req.query.search as string | undefined;
  const profiles = await listAvailableStaffProfiles(profileType, search);
  return sendSuccess(res, profiles);
}
