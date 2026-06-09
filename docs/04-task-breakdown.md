# Task Breakdown

## Current Priority

Build Phase 0 and Phase 1 first.

## Backend Tasks

### Setup

- [ ] Initialize backend app
- [ ] Add TypeScript
- [ ] Add env validation
- [ ] Add database connection
- [ ] Add error handler
- [ ] Add request logger
- [ ] Add validation middleware
- [ ] Add response format helper

### Auth

- [ ] Create users table/model
- [ ] Create roles table/model
- [ ] Create permissions table/model
- [ ] Create role_permissions table/model
- [ ] Seed super admin role
- [ ] Seed default permissions
- [ ] Create login API
- [ ] Create refresh token flow
- [ ] Create auth middleware
- [ ] Create permission middleware

### Vehicles

- [ ] Vehicle model
- [ ] Vehicle CRUD API
- [ ] Vehicle status transitions
- [ ] Vehicle document upload
- [ ] Vehicle list filters

### Drivers

- [ ] Driver model
- [ ] Driver CRUD API
- [ ] License expiry field
- [ ] Driver document upload
- [ ] Driver availability status

### Assets

- [ ] Asset category model
- [ ] Asset model
- [ ] Asset assignment model
- [ ] Asset history model
- [ ] Asset assignment API
- [ ] Asset return API
- [ ] Asset transfer API

### Trips

- [ ] Trip model
- [ ] Trip event model
- [ ] Create trip API
- [ ] Assign vehicle/driver API
- [ ] Start trip API
- [ ] End trip API
- [ ] Trip status validation
- [ ] Trip odometer validation

### Fuel and Expenses

- [ ] Fuel log model
- [ ] Fuel calculation service
- [ ] Fuel bill upload
- [ ] Expense model
- [ ] Expense proof upload
- [ ] Approval status flow

### Repair

- [ ] Repair ticket model
- [ ] Service job model
- [ ] Maintenance schedule model
- [ ] Before/after photo upload
- [ ] Repair status flow

### Reports

- [ ] Trip P&L service
- [ ] Vehicle P&L service
- [ ] Fuel report
- [ ] Repair report
- [ ] CSV export

## Web Tasks

- [ ] Auth pages
- [ ] Admin layout
- [ ] Sidebar
- [ ] Protected routes
- [ ] Dashboard cards
- [ ] Vehicle list
- [ ] Vehicle form
- [ ] Vehicle detail tabs
- [ ] Driver list
- [ ] Driver form
- [ ] Asset list
- [ ] Asset assignment page
- [ ] Trip board
- [ ] Trip form
- [ ] Fuel logs page
- [ ] Expenses page
- [ ] Repair page
- [ ] Finance approval page
- [ ] Reports page
- [ ] Settings page

## Mobile Tasks

- [ ] React Native project setup
- [ ] API client
- [ ] Auth storage
- [ ] Login screen
- [ ] Role-based home
- [ ] My trips screen
- [ ] Trip details screen
- [ ] Start trip screen
- [ ] End trip screen
- [ ] Fuel entry screen
- [ ] Expense entry screen
- [ ] Photo upload
- [ ] Offline-safe draft storage
- [ ] Notifications setup

## Review Rules

A task is not complete until:

- Code compiles
- API is tested
- UI handles loading/error/empty states
- Permission checks exist
- Validation exists
- No secrets are committed
- Progress is updated
