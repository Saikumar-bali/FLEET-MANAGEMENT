# Role Templates and Simple UX

## What Are Role Templates?

Role templates are predefined sets of permissions that can be assigned to users instead of manually ticking 100+ individual permissions. They make onboarding common roles fast and consistent.

## Available Templates

### Driver Basic
Basic driver portal access: trip creation, fuel entry, expense claims, document upload, issue reporting, inspections.

### Driver With Pool Vehicle
All Driver Basic permissions plus pool vehicle selection, self-checkout, and return capabilities.

### Manager Operations
Operations management: vehicle/driver/trip CRUD, submission review, fuel/expense approval, issue/inspection review.

### Finance Billing
Financial management: full finance access, trip billing, payments, customer/vendor management, expense approval, reports.

### Mechanic Maintenance
Repair and maintenance access: repair CRUD, maintenance requests, vehicle compliance, document viewing.

### Viewer Read Only
Read-only access to all operational modules. No create, update, approve, or delete permissions.

## Template Definition Format

```typescript
export type RoleTemplate = {
  name: string;
  key: string;
  description: string;
  permissions: string[];
};
```

Templates are defined in `backend/src/constants/role-templates.ts`.

## Applying a Template

Admins can apply templates in the Users page:
1. Open user detail
2. Go to Access tab
3. Select a template from the "Apply Template" dropdown
4. The template grants all listed permissions via permission overrides

This is non-destructive — existing permissions not in the template are preserved.

## Simple UX Rules

1. **No raw permission lists** in main workflow pages. Users should not see a wall of checkbox permissions.
2. **No large debug panels** by default. Advanced diagnostics are collapsed under Settings / My Access.
3. **Dialogs and drawers** for details instead of full table navigations.
4. **Quick action cards** for primary workflows. Each card has an icon, label, and navigates on click.
5. **Clear empty states** explain what happened, why, and what to do next.
6. **No emoji labels** anywhere in the UI.
7. **Buttons appear only when the capability says allowed.** If a user cannot check out a vehicle, the "Take Vehicle" button is not rendered.
8. **Forms are role-specific and short.** A driver sees a 3-field fuel form, not a 20-field finance form.
9. **My Access** is only under the user/settings menu, not in the main sidebar.
10. **Mobile responsive layout.** Quick actions wrap, navigation collapses, tables scroll horizontally.

## Current Status

- Role templates are defined but not yet integrated into the admin UI
- Templates can be applied via seed script or manual API calls
- Future work: add "Apply Template" dropdown to UsersPage Access tab
