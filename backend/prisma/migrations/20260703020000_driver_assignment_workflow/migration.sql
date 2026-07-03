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
