-- Up Migration
-- Add roles and account status for controlled developer/support access.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Keep a tamper-evident trail in the database for administrator lookups.
CREATE TABLE IF NOT EXISTS admin_access_log (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_access_log_created ON admin_access_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_access_log_target ON admin_access_log(target_user_id, created_at DESC);

-- Down Migration
DROP INDEX IF EXISTS idx_admin_access_log_target;
DROP INDEX IF EXISTS idx_admin_access_log_created;
DROP TABLE IF EXISTS admin_access_log;
DROP INDEX IF EXISTS idx_users_role_active;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
ALTER TABLE users DROP COLUMN IF EXISTS role;
