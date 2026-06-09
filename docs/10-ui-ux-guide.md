# UI/UX Guide

## Design Goal

The UI should look like a modern SaaS fleet platform, not an old ERP table-only system.

## Inspiration Direction

Take inspiration from:

- Fleetbase style: logistics dashboard, map, dispatch board
- Traccar style: vehicle tracking and map history
- Odoo style: clean ERP forms and list views
- Modern SaaS dashboards: cards, filters, tabs, timelines

Do not copy UI directly. Build original screens.

## Visual Style

Recommended style:

- Clean white background
- Soft cards
- Strong sidebar
- Professional icons
- Status chips
- Dashboard metrics
- Modern forms
- Responsive tables
- Optional dark mode later

## Colors

Use semantic colors:

- Green: available, approved, completed
- Yellow/orange: pending, warning, due soon
- Red: rejected, expired, breakdown
- Blue: active, assigned, in progress
- Gray: inactive, draft, archived

## Core UI Patterns

### Dashboard Card

Each card should show:

- Metric title
- Count/amount
- Small icon
- Trend or helper text

### Status Chip

Example statuses:

- Available
- On Trip
- Under Repair
- Pending Approval
- Approved
- Rejected
- Completed

### Detail Page

Use tabs:

- Overview
- History
- Documents
- Expenses
- Reports

### Timeline

Use timeline for:

- Asset history
- Trip events
- Repair updates
- Approval history

## Mobile UI

Mobile screens should be:

- Large buttons
- Minimal typing
- Camera upload easy
- Clear status display
- One primary action per screen
- Offline/network warning

## Quality Bar

Do not accept UI if:

- Table has no loading state
- Form has no validation
- Buttons are not permission-protected
- Status is plain text everywhere
- Mobile screen is too crowded
- Empty states are missing
