-- App-wide performance indexes for high-frequency authenticated navigation.
-- These are safe IF NOT EXISTS indexes for existing tables/columns used by
-- workspace, notification, dashboard, and list/aggregate endpoints.

CREATE INDEX IF NOT EXISTS notification_recipients_unread_user_idx
ON notification_recipients(user_id)
WHERE read_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS notification_recipients_user_created_unarchived_idx
ON notification_recipients(user_id, created_at DESC)
WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS user_profile_links_user_status_type_primary_idx
ON user_profile_links(user_id, status, profile_type, is_primary);

CREATE INDEX IF NOT EXISTS user_data_scopes_user_expires_idx
ON user_data_scopes(user_id, expires_at);

CREATE INDEX IF NOT EXISTS vehicles_status_idx
ON vehicles(status);

CREATE INDEX IF NOT EXISTS drivers_status_idx
ON drivers(status);

CREATE INDEX IF NOT EXISTS trips_status_created_idx
ON trips(status, created_at DESC);

CREATE INDEX IF NOT EXISTS trips_status_updated_idx
ON trips(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS fuel_entries_fuel_date_idx
ON fuel_entries(fuel_date DESC);

CREATE INDEX IF NOT EXISTS expenses_expense_date_idx
ON expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS maintenance_requests_status_idx
ON maintenance_requests(status);

CREATE INDEX IF NOT EXISTS repairs_status_idx
ON repairs(status);

CREATE INDEX IF NOT EXISTS documents_status_idx
ON documents(document_status);

CREATE INDEX IF NOT EXISTS documents_verification_status_idx
ON documents(verification_status);

CREATE INDEX IF NOT EXISTS documents_expiry_date_idx
ON documents(expiry_date);

CREATE INDEX IF NOT EXISTS vehicle_compliance_documents_status_valid_to_idx
ON vehicle_compliance_documents(status, valid_to);
