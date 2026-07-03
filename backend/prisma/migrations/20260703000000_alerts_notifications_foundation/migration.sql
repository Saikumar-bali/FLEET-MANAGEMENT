CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO',
  entity_type TEXT,
  entity_id TEXT,
  action_url TEXT,
  metadata JSONB,
  created_by_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
CREATE INDEX IF NOT EXISTS notifications_entity_idx ON notifications(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  recipient_kind TEXT NOT NULL DEFAULT 'USER',
  role_key TEXT,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_recipients_user_read_idx ON notification_recipients(user_id, read_at);
CREATE INDEX IF NOT EXISTS notification_recipients_user_created_idx ON notification_recipients(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  user_id TEXT,
  channel TEXT NOT NULL DEFAULT 'IN_APP',
  status TEXT NOT NULL,
  provider TEXT,
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS notification_delivery_logs_notification_channel_idx ON notification_delivery_logs(notification_id, channel);

CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  recipient_policy JSONB NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key, entity_type, entity_id, remind_at)
);

CREATE INDEX IF NOT EXISTS scheduled_reminders_status_remind_idx ON scheduled_reminders(status, remind_at);
