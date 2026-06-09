export function hasAnyPermission(currentPermissions: string[], requiredPermissions: string[]) {
  if (requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.some((permission) => currentPermissions.includes(permission));
}
