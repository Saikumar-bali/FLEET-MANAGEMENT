# React Native Mobile App Guide

## Mobile App Purpose

The mobile app is for field users:

- Driver
- Assistant driver
- Supervisor
- Collector
- Mechanic

The mobile app should not contain every admin feature. Keep it simple and task-focused.

## Shared Mobile Features

- Login
- Token storage
- Role-based home screen
- Notifications
- Photo upload
- Location permission later
- Offline draft support later

## Driver Flow

Screens:

1. Login
2. Driver Home
3. My Assigned Trip
4. Trip Details
5. Start Trip
6. Upload Start Odometer Photo
7. Add Fuel
8. Add Expense
9. Report Breakdown
10. End Trip
11. Upload End Odometer Photo
12. Trip History

Driver actions:

- Start trip
- End trip
- Upload odometer photo
- Add fuel bill
- Add trip expense
- Report vehicle issue
- View assigned vehicle
- View notifications

## Supervisor Flow

Screens:

1. Supervisor Home
2. Assigned Trips
3. Vehicle Status
4. Driver Status
5. Pending Fuel Approvals
6. Pending Expense Approvals
7. Repair Requests
8. Trip Verification

Supervisor actions:

- View assigned branch trips
- Approve/reject field submissions
- Create repair ticket
- Verify trip start/end photos
- Check vehicle availability

## Collector Flow

Screens:

1. Collection Home
2. Assigned Collections
3. Collection Detail
4. Add Payment
5. Upload Proof
6. Collection History

Collector actions:

- Add cash/online collection
- Upload payment proof
- Submit collection for finance approval

## Mechanic Flow

Screens:

1. Mechanic Home
2. Assigned Repair Jobs
3. Repair Detail
4. Add Work Update
5. Upload Before Photo
6. Upload After Photo
7. Close Job

Mechanic actions:

- View assigned repair
- Add parts/labour notes
- Upload photos
- Mark job completed

## Mobile API Rules

- Reuse backend API.
- Do not create duplicate business logic in mobile.
- Use backend status validation.
- Store auth token securely.
- Handle expired token.
- Compress images before upload.
- Show loading/error states.
- Avoid crashes when network fails.

## MVP Mobile Scope

Build only:

- Login
- Driver home
- My trip
- Start trip
- End trip
- Add fuel
- Add expense
- Upload photo

After that add supervisor, collector, and mechanic flows.
