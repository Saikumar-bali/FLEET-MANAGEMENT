-- Complete real-world driver advance lifecycle
-- Adds approval/revision workflow, due-date aging support, and safe status constraints.

ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS due_date TIMESTAMP(3);
ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP(3);
ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP(3);
ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP(3);
ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS approved_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS reviewed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE driver_advances ADD COLUMN IF NOT EXISTS review_comments TEXT;

ALTER TABLE driver_advances DROP CONSTRAINT IF EXISTS driver_advances_status_check;
ALTER TABLE driver_advances ADD CONSTRAINT driver_advances_status_check
  CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','ISSUED','PARTIALLY_SETTLED','SETTLED','REJECTED','NEEDS_CHANGES','CANCELLED'));

CREATE INDEX IF NOT EXISTS driver_advances_due_date_idx ON driver_advances(due_date);
CREATE INDEX IF NOT EXISTS driver_advances_driver_open_idx ON driver_advances(driver_id, status, balance_amount);

INSERT INTO permissions (id, key, module, action, description, created_at, updated_at) VALUES
  ('perm_driver_advance_submit', 'driver_advance_submit', 'driver_advances', 'submit', 'Submit driver advances for approval', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_review', 'driver_advance_review', 'driver_advances', 'review', 'Review or send back driver advances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_approve', 'driver_advance_approve', 'driver_advances', 'approve', 'Approve driver advances before issue', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_report', 'driver_advance_report', 'driver_advances', 'report', 'View driver advance reports and aging', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
JOIN permissions p ON p.key IN (
  'driver_advance_submit', 'driver_advance_review', 'driver_advance_approve', 'driver_advance_report'
)
WHERE r.key IN ('super_admin', 'admin', 'finance', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;
