# UI Review Checklist

## Scope

Phase 2.1 only: enterprise UI refresh and user-management flow hardening for backend + web. Mobile remains out of scope.

## Visual Review Checklist

- Login works with the seeded admin account.
- Dashboard shows current user, current role, permission count, and backend health.
- Users page shows a visible `Create user` action when `user_create` is present.
- Create user opens a separate modal and does not conflict with edit mode.
- Email remains editable in create mode.
- Password is visible and required in create mode.
- Role dropdown loads available roles.
- Users list refreshes after create and selects the new user.
- Edit mode remains separate from create mode.
- Password reset remains separate from profile editing.
- Roles page loads without crashing and shows grouped permissions.
- Sidebar stays permission-based.
- Route guard shows `Access denied` when `user_view` is missing.
- Font sizes are compact and readable.
- Cards, spacing, and headings stay enterprise-sized instead of oversized.
- Responsive layout remains acceptable for the tested desktop workflow.

## Verification Proof

Date: `2026-06-10`

Local UI verification was completed with Playwright against:

- Web: `http://127.0.0.1:4173`
- Backend: `http://127.0.0.1:4000`

Playwright flow result:

- `PASS` Login as super admin
- `PASS` Dashboard shows current user, role, permissions, and backend health
- `PASS` Users page loads and create flow is clearly available
- `PASS` Create user modal loads role dropdown and required fields
- `PASS` New user appears in the list and becomes the selected profile
- `PASS` User role can be updated from Viewer to Manager
- `PASS` User status can be suspended and re-activated
- `PASS` User can be moved to a limited role and password reset separately from profile editing
- `PASS` Roles page still loads with the grouped permission matrix
- `PASS` New limited-permission user is denied access to `/users`

Summary:

- `10 passed, 0 failed`

## Notes

- The seeded admin no longer blocks the create-user flow.
- The user-management UI now supports clearer enterprise-style spacing and smaller typography.
- Permission-based route protection was verified through an actual login with a limited test user.
