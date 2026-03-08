-- ============================================================
-- Device Login schema (TV + Web по коду)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Сессии одноразового входа по коду
CREATE TABLE IF NOT EXISTS tv_login_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  user_id              TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'consumed', 'expired', 'cancelled')),
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at          TIMESTAMPTZ,
  consumed_at          TIMESTAMPTZ,
  requester_ip         TEXT,
  requester_user_agent TEXT,
  approver_ip          TEXT,
  approver_user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_tv_login_sessions_status_expires
  ON tv_login_sessions(status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_tv_login_sessions_user
  ON tv_login_sessions(user_id, approved_at DESC);

-- Расширение сессий метаданными устройства
ALTER TABLE IF EXISTS tv_login_sessions
  ADD COLUMN IF NOT EXISTS client_device_id TEXT,
  ADD COLUMN IF NOT EXISTS client_device_name TEXT,
  ADD COLUMN IF NOT EXISTS created_via TEXT;

-- Таблица подключенных устройств пользователя
CREATE TABLE IF NOT EXISTS user_devices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            TEXT NOT NULL,
  client_device_id   TEXT NOT NULL,
  device_name        TEXT,
  created_via        TEXT,
  first_connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at         TIMESTAMPTZ,
  UNIQUE (user_id, client_device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_last_seen
  ON user_devices(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_active
  ON user_devices(user_id, revoked_at);

-- Бэкфилл устройств из уже использованных входов по коду
INSERT INTO user_devices (
  user_id,
  client_device_id,
  device_name,
  created_via,
  first_connected_at,
  last_seen_at
)
SELECT
  s.user_id,
  s.client_device_id,
  COALESCE(NULLIF(s.client_device_name, ''), 'Устройство') AS device_name,
  s.created_via,
  COALESCE(s.consumed_at, s.approved_at, s.created_at, NOW()) AS first_connected_at,
  COALESCE(s.consumed_at, s.approved_at, s.created_at, NOW()) AS last_seen_at
FROM tv_login_sessions s
WHERE s.user_id IS NOT NULL
  AND s.client_device_id IS NOT NULL
  AND s.client_device_id <> ''
  AND s.status = 'consumed'
ON CONFLICT (user_id, client_device_id)
DO UPDATE SET
  device_name = EXCLUDED.device_name,
  created_via = COALESCE(user_devices.created_via, EXCLUDED.created_via),
  last_seen_at = GREATEST(user_devices.last_seen_at, EXCLUDED.last_seen_at);
