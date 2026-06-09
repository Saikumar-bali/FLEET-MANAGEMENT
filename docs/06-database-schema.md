# Database Schema

This is the recommended MVP schema. Use UUID or auto-increment IDs consistently.

## Auth and Access

### users

- id
- name
- email
- mobile
- password_hash
- role_id
- status
- last_login_at
- created_at
- updated_at

### roles

- id
- name
- key
- description
- created_at
- updated_at

### permissions

- id
- key
- module
- description
- created_at
- updated_at

### role_permissions

- id
- role_id
- permission_id
- created_at

## Company

### companies

- id
- name
- legal_name
- gst_number
- email
- mobile
- address
- logo_url
- status
- created_at
- updated_at

### branches

- id
- company_id
- name
- address
- contact_person
- mobile
- status
- created_at
- updated_at

## Vehicles

### vehicles

- id
- company_id
- branch_id
- vehicle_number
- vehicle_type
- brand
- model
- year
- fuel_type
- chassis_number
- engine_number
- rc_number
- insurance_expiry
- fitness_expiry
- pollution_expiry
- permit_expiry
- current_odometer
- status
- current_driver_id
- created_at
- updated_at

### vehicle_documents

- id
- vehicle_id
- document_type
- document_number
- expiry_date
- file_url
- uploaded_by
- created_at
- updated_at

## Drivers and Staff

### drivers

- id
- company_id
- branch_id
- name
- mobile
- alternate_mobile
- license_number
- license_expiry
- address
- emergency_contact
- experience_years
- status
- created_at
- updated_at

### driver_documents

- id
- driver_id
- document_type
- document_number
- expiry_date
- file_url
- uploaded_by
- created_at
- updated_at

## Assets

### asset_categories

- id
- name
- key
- description
- status
- created_at
- updated_at

### assets

- id
- company_id
- asset_category_id
- asset_code
- name
- serial_number
- purchase_date
- purchase_amount
- current_status
- notes
- created_at
- updated_at

### asset_assignments

- id
- asset_id
- assigned_to_type
- assigned_to_id
- assigned_by
- assigned_at
- returned_at
- status
- notes
- created_at
- updated_at

### asset_history

- id
- asset_id
- action
- from_holder_type
- from_holder_id
- to_holder_type
- to_holder_id
- remarks
- photo_url
- created_by
- created_at

## Trips

### trips

- id
- company_id
- branch_id
- trip_number
- vehicle_id
- driver_id
- assistant_driver_id
- source
- destination
- planned_start_at
- actual_start_at
- actual_end_at
- start_odometer
- end_odometer
- expected_km
- actual_km
- revenue_amount
- status
- created_by
- created_at
- updated_at

### trip_events

- id
- trip_id
- event_type
- old_status
- new_status
- remarks
- latitude
- longitude
- photo_url
- created_by
- created_at

## Fuel and Expense

### fuel_logs

- id
- company_id
- trip_id
- vehicle_id
- driver_id
- fuel_station_name
- fuel_type
- litres
- rate_per_litre
- total_amount
- odometer_reading
- bill_number
- bill_photo_url
- payment_mode
- approval_status
- approved_by
- approved_at
- created_at
- updated_at

### expense_categories

- id
- name
- key
- status
- created_at
- updated_at

### trip_expenses

- id
- company_id
- trip_id
- vehicle_id
- driver_id
- expense_category_id
- amount
- description
- proof_photo_url
- approval_status
- approved_by
- approved_at
- created_at
- updated_at

## Repair and Maintenance

### maintenance_schedules

- id
- vehicle_id
- schedule_type
- due_date
- due_odometer
- description
- status
- created_at
- updated_at

### repair_tickets

- id
- company_id
- vehicle_id
- trip_id
- reported_by
- issue_title
- issue_description
- priority
- status
- assigned_to
- estimated_cost
- final_cost
- created_at
- updated_at

### service_jobs

- id
- repair_ticket_id
- vendor_name
- mechanic_name
- labour_cost
- parts_cost
- total_cost
- before_photo_url
- after_photo_url
- status
- created_at
- updated_at

## Finance

### collections

- id
- company_id
- trip_id
- collected_by
- amount
- payment_mode
- reference_number
- proof_photo_url
- approval_status
- approved_by
- approved_at
- created_at
- updated_at

### audit_logs

- id
- company_id
- user_id
- action
- entity_type
- entity_id
- old_data_json
- new_data_json
- ip_address
- user_agent
- created_at
