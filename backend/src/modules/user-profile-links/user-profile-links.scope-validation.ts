import { ProfileType } from '@prisma/client';
import { getActorContext } from '../access/actor-context.service';
import { can } from '../access/access-policy.service';
import { AppError } from '../../utils/appError';

const SUPER_ADMIN_KEY = 'super_admin';

/**
 * Validate that the actor has proper scope to create a profile link.
 *
 * For DRIVER links:
 *   - actor must have profile_link_create permission
 *   - actor must also have DRIVER scope on the target driver (UPDATE or MANAGE)
 *   - super_admin bypasses scope check
 *   - GLOBAL/MANAGE data scope bypasses scope check
 *
 * For other profile types:
 *   - Scope validation not yet implemented
 *   - Fail closed: restrict to super_admin only until implemented
 */
export async function validateProfileLinkCreate(
  actorUserId: string,
  targetUserId: string,
  profileType: ProfileType,
  profileId: string,
): Promise<void> {
  const actor = await getActorContext(actorUserId);

  // Check basic permission
  if (!can(actor, 'profile_link_create')) {
    throw new AppError('You do not have permission to create profile links', 403);
  }

  // Super_admin bypasses all scope checks
  if (actor.isSuperAdmin) return;

  switch (profileType) {
    case 'DRIVER':
      await validateDriverLinkScope(actor, profileId);
      break;

    default:
      // Fail closed: other profile types not yet implemented
      // Only super_admin can create non-DRIVER links
      throw new AppError(
        `Creating ${profileType} profile links is restricted to super_admin until scope validation is implemented`,
        403,
      );
  }
}

/**
 * Validate actor has DRIVER scope for the target driver.
 * Requirements:
 *   - actor must have a DRIVER data scope covering the target driverId
 *   - scope accessLevel must be UPDATE or MANAGE
 *   - GLOBAL/MANAGE scope satisfies any driver scope requirement
 */
async function validateDriverLinkScope(
  actor: { user: { id: string }; isSuperAdmin: boolean; dataScopes: Array<{ scopeType: string; scopeId: string | null; accessLevel: string }> },
  driverId: string,
): Promise<void> {
  // Already checked super_admin before calling this, but defensive check
  if (actor.isSuperAdmin) return;

  // GLOBAL/MANAGE bypasses all driver scope checks
  const hasGlobalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (hasGlobalManage) return;

  // Check for DRIVER scope covering the target driverId
  const hasDriverScope = actor.dataScopes.some(ds => {
    if (ds.scopeType !== 'DRIVER') return false;
    // Specific driver scope must match
    if (ds.scopeId !== null && ds.scopeId !== driverId) return false;
    // Must be UPDATE or MANAGE level
    return ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
  });

  if (!hasDriverScope) {
    throw new AppError(
      'Access denied: you need DRIVER scope (UPDATE or MANAGE) on the target driver to create a profile link',
      403,
    );
  }
}
