-- Driver Advance & Settlement foundation
-- Cash accountability flow:
-- finance issues advance -> driver submits approved fuel/expense -> finance settles returned cash/balance/reimbursement.

CREATE TABLE IF NOT EXISTS driver_advances (
  id TEXT PRIMARY KEY,
  advance_number TEXT NOT NULL UNIQUE,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES finance_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  issued_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (issued_amount >= 0),
  settled_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (settled_amount >= 0),
  returned_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (returned_amount >= 0),
  balance_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance_amount >= 0),
  payment_mode TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_mode IN ('CASH','BANK_TRANSFER','UPI','CARD','CHEQUE','OTHER')),
  issued_at TIMESTAMP(3),
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PARTIALLY_SETTLED','SETTLED','CANCELLED')),
  issued_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMP(3),
  cancellation_reason TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS driver_advances_driver_idx ON driver_advances(driver_id, status);
CREATE INDEX IF NOT EXISTS driver_advances_vehicle_idx ON driver_advances(vehicle_id, status);
CREATE INDEX IF NOT EXISTS driver_advances_trip_idx ON driver_advances(trip_id, status);
CREATE INDEX IF NOT EXISTS driver_advances_status_idx ON driver_advances(status);
CREATE INDEX IF NOT EXISTS driver_advances_created_at_idx ON driver_advances(created_at DESC);

CREATE TABLE IF NOT EXISTS driver_settlements (
  id TEXT PRIMARY KEY,
  settlement_number TEXT NOT NULL UNIQUE,
  advance_id TEXT NOT NULL REFERENCES driver_advances(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
  submitted_fuel_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (submitted_fuel_total >= 0),
  approved_fuel_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (approved_fuel_total >= 0),
  submitted_expense_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (submitted_expense_total >= 0),
  approved_expense_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (approved_expense_total >= 0),
  returned_cash_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (returned_cash_amount >= 0),
  adjustment_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_approved_spend NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_approved_spend >= 0),
  settlement_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due_from_driver NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance_due_from_driver >= 0),
  reimbursement_due_to_driver NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (reimbursement_due_to_driver >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','SETTLED','REJECTED','NEEDS_CHANGES','CANCELLED')),
  submitted_at TIMESTAMP(3),
  reviewed_at TIMESTAMP(3),
  settled_at TIMESTAMP(3),
  reviewed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  settled_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_comments TEXT,
  notes TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS driver_settlements_advance_idx ON driver_settlements(advance_id, status);
CREATE INDEX IF NOT EXISTS driver_settlements_driver_idx ON driver_settlements(driver_id, status);
CREATE INDEX IF NOT EXISTS driver_settlements_vehicle_idx ON driver_settlements(vehicle_id, status);
CREATE INDEX IF NOT EXISTS driver_settlements_trip_idx ON driver_settlements(trip_id, status);
CREATE INDEX IF NOT EXISTS driver_settlements_status_idx ON driver_settlements(status);
CREATE INDEX IF NOT EXISTS driver_settlements_created_at_idx ON driver_settlements(created_at DESC);

CREATE TABLE IF NOT EXISTS driver_settlement_lines (
  id TEXT PRIMARY KEY,
  settlement_id TEXT NOT NULL REFERENCES driver_settlements(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL CHECK (line_type IN ('FUEL','EXPENSE','CASH_RETURN','ADJUSTMENT','SHORTAGE','REIMBURSEMENT')),
  fuel_entry_id TEXT REFERENCES fuel_entries(id) ON DELETE SET NULL,
  expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  approved_amount NUMERIC(14,2),
  description TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS driver_settlement_lines_settlement_idx ON driver_settlement_lines(settlement_id);
CREATE UNIQUE INDEX IF NOT EXISTS driver_settlement_lines_fuel_unique ON driver_settlement_lines(fuel_entry_id) WHERE fuel_entry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS driver_settlement_lines_expense_unique ON driver_settlement_lines(expense_id) WHERE expense_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS driver_settlement_history (
  id TEXT PRIMARY KEY,
  settlement_id TEXT REFERENCES driver_settlements(id) ON DELETE CASCADE,
  advance_id TEXT REFERENCES driver_advances(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  old_values JSONB,
  new_values JSONB,
  remarks TEXT,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS driver_settlement_history_settlement_idx ON driver_settlement_history(settlement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS driver_settlement_history_advance_idx ON driver_settlement_history(advance_id, created_at DESC);

-- Seed permissions used by the new API. IDs are deterministic so the migration is idempotent.
INSERT INTO permissions (id, key, module, action, description, created_at, updated_at) VALUES
  ('perm_driver_advance_view', 'driver_advance_view', 'driver_advances', 'view', 'View driver advances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_create', 'driver_advance_create', 'driver_advances', 'create', 'Create driver advances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_update', 'driver_advance_update', 'driver_advances', 'update', 'Update draft driver advances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_issue', 'driver_advance_issue', 'driver_advances', 'issue', 'Issue driver advance cash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_cancel', 'driver_advance_cancel', 'driver_advances', 'cancel', 'Cancel driver advances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_view', 'driver_settlement_view', 'driver_settlements', 'view', 'View driver settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_create', 'driver_settlement_create', 'driver_settlements', 'create', 'Create driver settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_review', 'driver_settlement_review', 'driver_settlements', 'review', 'Review driver settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_approve', 'driver_settlement_approve', 'driver_settlements', 'approve', 'Approve driver settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_settle', 'driver_settlement_settle', 'driver_settlements', 'settle', 'Close driver settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_cancel', 'driver_settlement_cancel', 'driver_settlements', 'cancel', 'Cancel driver settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_advance_view_own', 'driver_advance_view_own', 'driver_portal', 'advance_view_own', 'Driver portal: view own advances', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_view_own', 'driver_settlement_view_own', 'driver_portal', 'settlement_view_own', 'Driver portal: view own settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_settlement_submit_own', 'driver_settlement_submit_own', 'driver_portal', 'settlement_submit_own', 'Driver portal: submit own settlements', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perm_driver_cash_return_submit', 'driver_cash_return_submit', 'driver_portal', 'cash_return_submit', 'Driver portal: submit returned cash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

-- Finance/admin roles get finance-side permissions. Drivers get own portal permissions.
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
JOIN permissions p ON p.key IN (
  'driver_advance_view', 'driver_advance_create', 'driver_advance_update', 'driver_advance_issue', 'driver_advance_cancel',
  'driver_settlement_view', 'driver_settlement_create', 'driver_settlement_review', 'driver_settlement_approve', 'driver_settlement_settle', 'driver_settlement_cancel'
)
WHERE r.key IN ('super_admin', 'admin', 'finance', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
JOIN permissions p ON p.key IN (
  'driver_advance_view_own', 'driver_settlement_view_own', 'driver_settlement_submit_own', 'driver_cash_return_submit'
)
WHERE r.key IN ('driver')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id, CURRENT_TIMESTAMP
FROM roles r
JOIN permissions p ON p.key IN ('driver_advance_view', 'driver_settlement_view')
WHERE r.key IN ('viewer')
ON CONFLICT (role_id, permission_id) DO NOTHING;
