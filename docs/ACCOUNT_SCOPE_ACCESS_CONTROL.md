# Account Scope & Access Control

## Overview

This document explains the account-isolated access control system that determines what each user can see and do in the Fleet Management application. The system is built on four layers:

1. **Role Permissions** - Base permissions assigned to roles
2. **User Permission Overrides** - Per-user ALLOW/DENY overrides on top of role permissions
3. **Data Scopes** - What records a user can see/change based on ownership or assignment
4. **User Access Management UI** - Frontend pages for managing and diagnosing access

## Phase Status

- **Phase 1 (Backend Foundation)**: Complete
- **Phase 2 (User Access Management UI)**: Complete
- **Phase 3 (Module-level scope enforcement)**: Pending

## API Endpoints

### Access Control Endpoints (primary: `/api/v1/access/users/:id/*`)
### Access Control Endpoints (alias: `/api/v1/users/:id/*`)

| Endpoint | Method | Description | Permission Required |
|---|---|---|---|
| `/effective-permissions` | GET | Get effective permissions for a user | `user_view` |
| `/permission-overrides` | GET | List permission overrides | `user_view` |
| `/permission-overrides` | PUT | Set permission override (ALLOW/DENY) | `permission_assign` |
| `/permission-overrides/:permissionId` | DELETE | Remove permission override | `permission_assign` |
| `/data-scopes` | GET | List data scopes | `user_view` |
| `/data-scopes` | PUT | Grant data scope | `permission_assign` |
| `/data-scopes/:scopeId` | DELETE | Remove data scope | `permission_assign` |
| `/activity` | GET | Get user activity timeline | `user_view` |

Both `/access/users/:id/*` (primary) and `/users/:id/*` (alias) are available.

### User Access UI Pages

| Route | Page | Description |
|---|---|---|
| `/users` | UsersPage | User directory with Manage Access actions |
| `/users/:id` | UserDetailPage | 8-tab detail page (Profile, Account, Role, Effective Permissions, Permission Overrides, Data Scopes, Activity, Menu Preview) |
| `/my-access` | MyAccessPage | Self-service access diagnostics for every logged-in user |

The **effective permissions** for a user are computed as:  
`Role Permissions + ALLOW Overrides - DENY Overrides`

## Role Permissions

### What They Are
Role permissions define the base set of actions a user with a given role can perform. Each permission represents a specific operation (e.g., `vehicle.create`, `trip.view`, `finance.edit`).

### How They're Assigned to Roles
- System roles (`admin`, `super_admin`, `manager`, etc.) come with predefined permission sets
- Custom roles can be created with any combination of permissions
- Role-permission mappings are stored in the `RolePermission` table

### How They Work
When a user logs in, their role's permissions are loaded and used as the baseline for access control. All subsequent checks start from this set.

## User Permission Overrides

### What They Are
User permission overrides allow administrators to grant or deny specific permissions to individual users beyond their role's default permissions.

### How They Work
- **ALLOW Override**: Grants an additional permission not in the user's role
- **DENY Override**: Revokes a permission that would otherwise be granted by the user's role

### Storage
Overrides are stored in the `UserPermissionOverride` model with fields:
- `userId`: The user this override applies to
- `permission`: The permission identifier
- `effect`: `ALLOW` or `DENY`

## Data Scopes

### What They Are
Data scopes determine what records a user can see or modify based on ownership or assignment relationships.

### Scope Types
| Scope Type | Description | Example |
|------------|-------------|---------|
| `OWN` | Only records owned by the user | A driver sees only their own trips |
| `DRIVER` | Records assigned to specific drivers | A dispatcher sees trips for their assigned drivers |
| `VEHICLE` | Records associated with specific vehicles | `VEHICLE vehicle-1` — access to vehicle-1's records |
| `TRIP` | Records related to specific trips | `TRIP trip-123` — access to trip-123's data |
| `BRANCH` | Records within a specific branch | A branch manager sees all records in their branch |
| `ALL` | All records in the system | An admin with GLOBAL scope sees everything |
| `GLOBAL` | System-wide bypass | `GLOBAL MANAGE` — full management access across all modules |

### Access Level Hierarchy
When multiple scopes overlap, the highest access level wins:

`MANAGE > DELETE > UPDATE > CREATE > VIEW`

For example, a user with `VEHICLE vehicle-1 CREATE` and `VEHICLE vehicle-1 MANAGE` gets `MANAGE` for vehicle-1.

### How They Work
Data scopes are evaluated against record ownership or assignment fields. For example, a trip record might have `driverId` and `vehicleId` fields that are checked against the user's scopes.

## Effective Permissions

The effective permissions for a user are computed dynamically:

```
Effective Permissions = Role Permissions ∪ ALLOW Overrides - DENY Overrides
```

### Computation Process
1. Start with the user's role permissions
2. Add all ALLOW overrides (granting additional permissions)
3. Remove all DENY overrides (revoking permissions)

This allows fine-grained control: a user with a restrictive role can have specific permissions granted, or a user with a permissive role can have specific permissions revoked.

## Menu Visibility

Menus are filtered based on the user's effective permissions:
- Each menu item requires one or more permissions
- The frontend checks the user's effective permissions against menu requirements
- If the user lacks required permissions, the menu item is hidden
- Data scopes further filter what records appear in menu sections

## Current Phase

**Backend foundation only.** No UI yet, no driver workflow yet. This phase covers the access-policy service, API endpoints, and test harness. UI and workflow integration are planned for subsequent phases.

## Admin/Super Admin Exception

### super_admin
- **Global by role.** Bypasses all data scope restrictions.
- Can see and modify all records in the system.
- Effective permissions include all system permissions.

### admin
- **NOT automatically global.** Requires explicit `GLOBAL` scope or `MANAGE` scope, or a matching module scope to access data.
- Must be granted scopes or permission overrides to access cross-module data.

### GLOBAL Scope
- Can only be granted by `super_admin`.
- Provides system-wide data access (bypasses all data scope restrictions).

### MANAGE Scope
- Requires `super_admin`, or `admin` with the `permission_assign` permission.
- Grants ability to manage (create, update, delete) across a module.

### Critical Permissions
Critical permissions (`role.*`, `permission.*`, `system.*`) can only be granted by `super_admin`. Non-super_admin users (including admin) cannot grant these via overrides or scope assignments.

This is by design to ensure separation of privilege and prevent escalation.

## Manual Account Creation Flow

When creating a new user account:

1. **Create User** - Set basic user information (name, email, etc.)
2. **Assign Role** - Select an appropriate role that provides baseline permissions
3. **Grant Overrides (Only if needed)** - Add ALLOW/DENY overrides for exceptional cases
4. **Assign Scopes (Only if needed)** - Grant data scopes for specific records/ownership

### Best Practices
- Start with the most restrictive role that meets the user's needs
- Only add overrides when the role's default permissions are insufficient
- Use data scopes to limit access to specific records when needed
- Document why overrides are granted for audit purposes

## Why Full Reseed Is Not Recommended

A full database reseed (dropping and recreating all data) is **not recommended** because:

1. **Data Preservation** - Production systems contain valuable historical data
2. **User Disruption** - All users would lose their settings and customizations
3. **Configuration Loss** - Custom roles, overrides, and scopes would be lost
4. **Audit Trail Destruction** - Historical logs and audit trails would be deleted
5. **Integration Breakage** - External systems would lose references to deleted data

Instead, use **manual migrations** that:
- Add new tables/columns without removing existing data
- Preserve existing user accounts and configurations
- Allow rollback if issues are discovered
- Maintain data integrity throughout the process

## Diagnosing Missing Menu Items

If a user cannot see expected menu items, follow these steps:

### 1. Check My Access Page
Navigate to the "My Access" page to view:
- Current effective permissions
- Applied overrides
- Data scopes

### 2. Check Permissions
Verify the user has the required permissions:
```bash
npm --prefix backend run access:diagnose
```

### 3. Check Scopes
Ensure the user has appropriate data scopes:
- Check if the user has `ALL` scope for global access
- Verify specific scopes for targeted data access
- Confirm scopes are correctly assigned in the database

### 4. Common Issues
- **Missing Role Permissions**: The role may not include the required permission
- **DENY Override**: An explicit DENY override may be revoking the permission
- **Missing Data Scope**: The user may have the permission but no scope to access the data
- **Menu Configuration**: The menu item may require a different permission than expected

## Running Tests

### Account Scope Tests
Run the account scope tests to verify access control (16 checks including admin rules, GLOBAL scope restriction, audit, access-policy):
```bash
npm --prefix backend run test:account-scope
```

### Access Diagnostics
Run the access diagnostics tool:
```bash
npm --prefix backend run access:diagnose
```

## Implementation Details

The access control system is implemented through:
- **ActorContext**: Identifies the current user and their context
- **AccessPolicy**: Evaluates permissions against requested actions
- **EffectivePermissions Service**: Computes the final permission set
- **DataScope Service**: Filters records based on ownership/assignment

For technical implementation details, see the companion document:  
`docs/ai-runs/2026-06-29_account-scope-foundation.md`