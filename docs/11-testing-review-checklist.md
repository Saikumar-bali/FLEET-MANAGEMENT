# Testing and Senior Review Checklist

## General Review

- [ ] Code compiles
- [ ] No TypeScript errors
- [ ] No unused major files
- [ ] No console spam
- [ ] No hardcoded secrets
- [ ] `.env.example` is updated
- [ ] README instructions work
- [ ] API errors are handled cleanly
- [ ] UI handles loading/empty/error states

## Backend Review

- [ ] Controllers are thin
- [ ] Business logic is in services
- [ ] Validation exists for all create/update APIs
- [ ] Auth middleware exists
- [ ] Permission middleware exists
- [ ] DB relationships are correct
- [ ] Transactions are used for multi-table updates
- [ ] Audit logs are added for critical actions
- [ ] File uploads validate type and size
- [ ] Pagination exists for list APIs

## Security Review

- [ ] Passwords are hashed
- [ ] JWT secret is from env
- [ ] Refresh token strategy exists or is planned
- [ ] User cannot access unauthorized modules
- [ ] User cannot approve own restricted transaction unless allowed
- [ ] Upload path is protected
- [ ] Delete actions require permission
- [ ] Role changes are audited

## Business Logic Review

- [ ] Vehicle cannot be assigned to two active trips
- [ ] Driver cannot be assigned to two active trips
- [ ] Trip start requires vehicle and driver
- [ ] End odometer cannot be less than start odometer
- [ ] Fuel calculations are correct
- [ ] Approved costs affect P&L
- [ ] Rejected costs do not affect P&L
- [ ] Asset assignment history is preserved

## Web Review

- [ ] Sidebar respects permissions
- [ ] Forms show validation errors
- [ ] Tables have search/filter/pagination
- [ ] Detail pages use tabs
- [ ] Status chips are used
- [ ] Destructive actions ask confirmation
- [ ] Export buttons are permission-protected

## Mobile Review

- [ ] Login works
- [ ] Token is stored securely
- [ ] Driver can view assigned trip
- [ ] Driver can start/end trip
- [ ] Photo upload works
- [ ] Network error is handled
- [ ] Mobile UI is not overcrowded

## Deployment Review

- [ ] Production env variables documented
- [ ] Database migration works
- [ ] Seed works
- [ ] Build commands work
- [ ] Logs are available
- [ ] Backup plan exists
