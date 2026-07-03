CREATE TABLE IF NOT EXISTS trip_driver_assignments (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  assigned_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  reassigned_from_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_driver_assignments_status_check CHECK (status IN ('PENDING','ACCEPTED','REJECTED','REASSIGNED','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS trip_driver_assignments_trip_idx ON trip_driver_assignments(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trip_driver_assignments_driver_idx ON trip_driver_assignments(driver_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS trip_driver_assignments_one_open_idx
  ON trip_driver_assignments(trip_id)
  WHERE status IN ('PENDING','ACCEPTED');

INSERT INTO permissions (id, key, module, action, description)
VALUES
  ('perm_driver_trip_accept', 'driver_trip_accept', 'driver_portal', 'trip_accept', 'Driver portal: accept assigned trip'),
  ('perm_driver_trip_reject', 'driver_trip_reject', 'driver_portal', 'trip_reject', 'Driver portal: reject assigned trip')
ON CONFLICT (key) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || r.key || '_' || p.key, r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN ('driver_trip_accept','driver_trip_reject')
WHERE r.key IN ('super_admin','admin','driver','assistant_driver')
ON CONFLICT (role_id, permission_id) DO NOTHING;
