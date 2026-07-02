import type { NavItem } from '../config/navigation';

export type MenuVisibilityResult = {
  visible: boolean;
  reason: string;
  missingPermissions: string[];
  missingProfileTypes: string[];
  missingScope: boolean;
  missingPrimaryDriverProfile: boolean;
};

/**
 * Explain why a nav item is visible or hidden for a given user context.
 */
export function explainMenuVisibility(
  item: NavItem,
  context: {
    roleKey: string | undefined;
    effectivePermissions: string[];
    profileTypes: string[];
    hasPrimaryDriverProfile: boolean;
    hasGlobalAccess: boolean;
  },
): MenuVisibilityResult {
  const { roleKey, effectivePermissions, profileTypes, hasPrimaryDriverProfile, hasGlobalAccess } = context;
  const isSuperAdmin = roleKey === 'super_admin';

  // super_admin sees everything
  if (isSuperAdmin) {
    return { visible: true, reason: 'super_admin — all items visible', missingPermissions: [], missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: false };
  }

  // hiddenForRoleKeys check
  if (item.hiddenForRoleKeys?.includes(roleKey ?? '')) {
    return { visible: false, reason: `Hidden for role "${roleKey}"`, missingPermissions: [], missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: false };
  }

  // requiredRoleKeys check
  if (item.requiredRoleKeys && !item.requiredRoleKeys.includes(roleKey ?? '')) {
    return { visible: false, reason: `Requires role: ${item.requiredRoleKeys.join(' or ')}`, missingPermissions: [], missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: false };
  }

  // requireGlobalAccess check
  if (item.requireGlobalAccess && !hasGlobalAccess) {
    return { visible: false, reason: 'Requires global access scope', missingPermissions: [], missingProfileTypes: [], missingScope: true, missingPrimaryDriverProfile: false };
  }

  // requirePrimaryDriverProfile check
  if (item.requirePrimaryDriverProfile && !hasPrimaryDriverProfile) {
    return { visible: false, reason: 'Requires active primary DRIVER profile', missingPermissions: [], missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: true };
  }

  // requiredProfileTypes check
  const missingProfileTypes = (item.requiredProfileTypes ?? []).filter((t) => !profileTypes.includes(t));
  if (missingProfileTypes.length > 0 && (item.requiredProfileTypes ?? []).length > 0) {
    return { visible: false, reason: `Missing profile type(s): ${missingProfileTypes.join(', ')}`, missingPermissions: [], missingProfileTypes, missingScope: false, missingPrimaryDriverProfile: false };
  }

  // requiredPermissions check (ALL must match)
  const missingPermissions = (item.requiredPermissions ?? []).filter((p) => !effectivePermissions.includes(p));
  if (missingPermissions.length > 0) {
    return { visible: false, reason: `Missing permission(s): ${missingPermissions.join(', ')}`, missingPermissions, missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: false };
  }

  // requiredAnyPermissions check (ANY must match)
  if ((item.requiredAnyPermissions ?? []).length > 0) {
    const hasAny = item.requiredAnyPermissions!.some((p) => effectivePermissions.includes(p));
    if (!hasAny) {
      return { visible: false, reason: `Need one of: ${item.requiredAnyPermissions!.join(', ')}`, missingPermissions: [...item.requiredAnyPermissions!], missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: false };
    }
  }

  return { visible: true, reason: 'Accessible', missingPermissions: [], missingProfileTypes: [], missingScope: false, missingPrimaryDriverProfile: false };
}
