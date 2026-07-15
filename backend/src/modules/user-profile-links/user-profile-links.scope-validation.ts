import { ProfileType } from '@prisma/client';
import { getActorContext } from '../access/actor-context.service';
import { can } from '../access/access-policy.service';
import { AppError } from '../../utils/appError';

/**
 * Validate that the actor has proper scope to create a profile link.
 *
 * For DRIVER links:
 *   - actor must have DRIVER scope on the target driver (UPDATE or MANAGE)
 * For MECHANIC / EMPLOYEE / FINANCE / COLLECTOR (user-based):
 *   - actor must have USER scope on the target user (UPDATE or MANAGE)
 * For VENDOR_CONTACT:
 *   - actor must have VENDOR scope on the target vendor (UPDATE or MANAGE)
 * For CUSTOMER_CONTACT:
 *   - actor must have CUSTOMER scope on the target customer (UPDATE or MANAGE)
 * For all types:
 *   - super_admin bypasses all scope checks
 *   - GLOBAL/MANAGE data scope bypasses scope checks
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

    case 'MECHANIC':
    case 'EMPLOYEE':
    case 'FINANCE':
    case 'COLLECTOR':
      await validateUserLinkScope(actor, profileId);
      break;

    case 'VENDOR_CONTACT':
      await validateVendorLinkScope(actor, profileId);
      break;

    case 'CUSTOMER_CONTACT':
      await validateCustomerLinkScope(actor, profileId);
      break;

    default:
      throw new AppError(`Unknown profile type: ${profileType}`, 400);
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

async function validateUserLinkScope(
  actor: { user: { id: string }; isSuperAdmin: boolean; dataScopes: Array<{ scopeType: string; scopeId: string | null; accessLevel: string }> },
  userId: string,
): Promise<void> {
  if (actor.isSuperAdmin) return;

  const hasGlobalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (hasGlobalManage) return;

  const hasUserScope = actor.dataScopes.some(ds => {
    if (ds.scopeType !== 'USER') return false;
    if (ds.scopeId !== null && ds.scopeId !== userId) return false;
    return ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
  });

  if (!hasUserScope) {
    throw new AppError(
      'Access denied: you need USER scope (UPDATE or MANAGE) on the target user to create a profile link',
      403,
    );
  }
}

async function validateVendorLinkScope(
  actor: { user: { id: string }; isSuperAdmin: boolean; dataScopes: Array<{ scopeType: string; scopeId: string | null; accessLevel: string }> },
  vendorId: string,
): Promise<void> {
  if (actor.isSuperAdmin) return;

  const hasGlobalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (hasGlobalManage) return;

  const hasVendorScope = actor.dataScopes.some(ds => {
    if (ds.scopeType !== 'VENDOR') return false;
    if (ds.scopeId !== null && ds.scopeId !== vendorId) return false;
    return ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
  });

  if (!hasVendorScope) {
    throw new AppError(
      'Access denied: you need VENDOR scope (UPDATE or MANAGE) on the target vendor to create a profile link',
      403,
    );
  }
}

async function validateCustomerLinkScope(
  actor: { user: { id: string }; isSuperAdmin: boolean; dataScopes: Array<{ scopeType: string; scopeId: string | null; accessLevel: string }> },
  customerId: string,
): Promise<void> {
  if (actor.isSuperAdmin) return;

  const hasGlobalManage = actor.dataScopes.some(
    ds => ds.scopeType === 'GLOBAL' && ds.accessLevel === 'MANAGE',
  );
  if (hasGlobalManage) return;

  const hasCustomerScope = actor.dataScopes.some(ds => {
    if (ds.scopeType !== 'CUSTOMER') return false;
    if (ds.scopeId !== null && ds.scopeId !== customerId) return false;
    return ds.accessLevel === 'UPDATE' || ds.accessLevel === 'MANAGE';
  });

  if (!hasCustomerScope) {
    throw new AppError(
      'Access denied: you need CUSTOMER scope (UPDATE or MANAGE) on the target customer to create a profile link',
      403,
    );
  }
}
