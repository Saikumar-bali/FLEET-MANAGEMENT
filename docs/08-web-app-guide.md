# Web App Guide

## Web App Purpose

The web app is for admin, manager, supervisor, finance, and office users.

## Layout

Use a professional SaaS layout:

- Left sidebar
- Top navbar
- Breadcrumb
- Dashboard cards
- Data tables
- Filters
- Details pages with tabs
- Right drawer for quick forms
- Modal only for small actions
- Light/dark mode later

## Pages

### Auth

- Login
- Forgot password later

### Dashboard

Cards:

- Total vehicles
- Available vehicles
- Vehicles on trip
- Vehicles under repair
- Active drivers
- Today trips
- Pending fuel approvals
- Pending expense approvals
- This month fuel cost
- This month profit/loss

### Vehicles

Pages:

- Vehicle list
- Create vehicle
- Edit vehicle
- Vehicle profile

Vehicle profile tabs:

- Overview
- Trips
- Fuel
- Expenses
- Repairs
- Documents
- Asset assignments
- P&L
- Audit history

### Drivers

Pages:

- Driver list
- Create driver
- Edit driver
- Driver profile

Driver profile tabs:

- Overview
- Assigned trips
- Documents
- Fuel logs
- Expenses
- Audit history

### Assets

Pages:

- Asset list
- Asset detail
- Asset assignment
- Asset history

### Trips

Pages:

- Trip list
- Trip board
- Create trip
- Trip detail

Trip detail tabs:

- Overview
- Events
- Fuel
- Expenses
- Collections
- Photos
- P&L

### Fuel

Pages:

- Fuel logs
- Pending approvals
- Fuel report

### Expenses

Pages:

- Expense logs
- Pending approvals
- Expense report

### Repairs

Pages:

- Repair tickets
- Maintenance schedules
- Service jobs

### Finance

Pages:

- Pending approvals
- Collections
- Trip P&L
- Vehicle P&L
- Monthly P&L

### Reports

Pages:

- Daily trip report
- Vehicle-wise report
- Driver-wise report
- Fuel report
- Repair cost report
- Maintenance due report
- Document expiry report
- Collection report

## Component Standards

Every table must have:

- Search
- Pagination
- Loading state
- Empty state
- Error state
- Export button where useful
- Permission-based actions

Every form must have:

- Validation
- Clear labels
- Required marks
- Save/cancel actions
- API error display
- No silent failure

## UI Quality Rules

- Use consistent spacing.
- Use status chips for statuses.
- Use confirmation dialogs for destructive actions.
- Use timeline UI for history.
- Use tabs for detail pages.
- Avoid overcrowded modals.
