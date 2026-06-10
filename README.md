# Fleet Management Platform

A complete dynamic **Fleet Management Web Dashboard + React Native App**.

This project is inspired by good ideas from open-source fleet/logistics systems, but it must be built as our own product, not as a direct clone.

## Main Goal

Build a business-ready fleet management system for:

- Vehicles
- Drivers and assistant drivers
- Supervisors
- Trips / transfers
- Fuel logs
- Fixed and manual assets
- Asset assignment history
- Maintenance and repair
- Photos and documents
- Expenses and collections
- Finance approvals
- Vehicle-wise and trip-wise P&L
- Web dashboard
- React Native mobile app

## Planned Apps

| App | Users | Purpose |
|---|---|---|
| Web Admin Dashboard | Admin, Manager, Supervisor, Finance | Full operations, approvals, reports |
| React Native Mobile App | Driver, Assistant Driver, Supervisor, Collector, Mechanic | Field operations, trip updates, photo upload, fuel/expense entry |
| Backend API | All clients | Auth, permissions, workflows, reports, sync |
| Database | System | Source of truth |

## Build Order

1. Backend foundation
2. Auth, roles, and permissions
3. Web dashboard layout
4. Vehicle, driver, and asset masters
5. Trip / transfer workflow
6. Fuel and expense workflow
7. Maintenance and repair workflow
8. Finance and P&L
9. React Native mobile app
10. Reports, notifications, tracking, and deployment

## Documentation Index

| File | Purpose |
|---|---|
| `docs/01-project-brief.md` | Product scope and business requirements |
| `docs/02-roadmap.md` | 3-week MVP roadmap and later roadmap |
| `docs/03-phases.md` | Phase-by-phase implementation plan |
| `docs/04-task-breakdown.md` | Developer-ready task list |
| `docs/05-architecture.md` | System architecture |
| `docs/06-database-schema.md` | Database tables and relationships |
| `docs/07-api-design.md` | REST API design |
| `docs/08-web-app-guide.md` | Web app pages and components |
| `docs/09-mobile-app-guide.md` | React Native app screens and flows |
| `docs/10-ui-ux-guide.md` | Beautiful UI/UX direction |
| `docs/11-testing-review-checklist.md` | Senior developer review checklist |
| `docs/12-deployment-guide.md` | Deployment plan |
| `docs/13-cli-ai-execution-guide.md` | Rules for CLI-AI execution |
| `docs/14-cli-ai-phase-prompts.md` | Professional prompts for CLI-AI |
| `tasks.md` | Current implementation tasks |
| `progress.md` | Progress tracker |

## Important Rule

Do not start GPS, complex maps, or mobile animations before the backend workflows are stable.

## Demo Login Seed

For local or staging-demo environments only, the backend seed supports memorable role-based credentials when `ENABLE_DEMO_USERS=true`.

- Super admin: username `admin`
- Admin: username `opsadmin`, password `opsadmin@123`
- Manager: username `manager`, password `manager@123`
- Supervisor: username `supervisor`, password `supervisor@123`
- Driver: username `driver`, password `driver@123`
- Assistant driver: username `assistantdriver`, password `assistant@123`
- Collector: username `collector`, password `collector@123`
- Mechanic: username `mechanic`, password `mechanic@123`
- Finance: username `finance`, password `finance@123`
- Viewer: username `viewer`, password `viewer@123`

The super admin password continues to come from `ADMIN_PASSWORD`, so it can stay environment-controlled instead of being committed as a shared production secret.

Production safety rule:

- `ENABLE_DEMO_USERS=true` is blocked when `NODE_ENV=production`.
