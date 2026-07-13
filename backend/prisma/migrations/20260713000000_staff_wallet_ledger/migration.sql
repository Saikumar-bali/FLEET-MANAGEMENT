-- Role-neutral accountable cash wallet and immutable ledger.
CREATE TABLE staff_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES staff_wallets(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('CREDIT','DEBIT')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ADVANCE','FUEL','EXPENSE','RETURN','REIMBURSEMENT','ADJUSTMENT','REVERSAL')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(14,2) NOT NULL CHECK (balance_before >= 0),
  balance_after NUMERIC(14,2) NOT NULL CHECK (balance_after >= 0),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  description TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX staff_wallet_transactions_wallet_idx ON staff_wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX staff_wallet_transactions_source_idx ON staff_wallet_transactions(source_type, source_id);
CREATE INDEX staff_wallet_transactions_trip_idx ON staff_wallet_transactions(trip_id, created_at DESC);

ALTER TABLE driver_advances ADD COLUMN include_existing_balance BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE driver_advances ADD COLUMN existing_balance_applied NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (existing_balance_applied >= 0);
ALTER TABLE driver_advances ADD COLUMN cash_issued_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cash_issued_amount >= 0);

ALTER TABLE driver_settlements ADD COLUMN balance_disposition TEXT NOT NULL DEFAULT 'RETURN'
  CHECK (balance_disposition IN ('RETURN','CARRY_FORWARD'));

INSERT INTO permissions (id, key, module, action, description, created_at, updated_at) VALUES
 ('perm_staff_wallet_view', 'staff_wallet_view', 'staff_wallets', 'view', 'View staff wallets and ledger', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
 ('perm_staff_wallet_adjust', 'staff_wallet_adjust', 'staff_wallets', 'adjust', 'Post controlled staff wallet adjustments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
 ('perm_staff_wallet_view_own', 'staff_wallet_view_own', 'staff_wallets', 'view_own', 'View own wallet and ledger', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET description=EXCLUDED.description, updated_at=CURRENT_TIMESTAMP;

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id, CURRENT_TIMESTAMP
FROM roles r JOIN permissions p ON p.key IN ('staff_wallet_view','staff_wallet_adjust')
WHERE r.key IN ('super_admin','admin','finance','manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id, CURRENT_TIMESTAMP
FROM roles r JOIN permissions p ON p.key = 'staff_wallet_view_own'
WHERE r.status = 'ACTIVE'
ON CONFLICT (role_id, permission_id) DO NOTHING;
