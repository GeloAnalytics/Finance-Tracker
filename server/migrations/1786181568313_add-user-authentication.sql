-- Up Migration
-- Migration: Add User Authentication and multi-tenant user isolation

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add user_id column to user data tables
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Update unique constraint on budgets to (user_id, category_id, month, year)
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_month_year_key;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_id_month_year_key;
ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_category_id_month_year_key UNIQUE (user_id, category_id, month, year);

-- Indexes for performance per user query
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Down Migration

DROP INDEX IF EXISTS idx_chat_messages_user;
DROP INDEX IF EXISTS idx_savings_goals_user;
DROP INDEX IF EXISTS idx_debts_user;
DROP INDEX IF EXISTS idx_budgets_user;
DROP INDEX IF EXISTS idx_transactions_user;

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_id_month_year_key;
ALTER TABLE budgets ADD CONSTRAINT budgets_category_id_month_year_key UNIQUE (category_id, month, year);

ALTER TABLE chat_messages DROP COLUMN IF EXISTS user_id;
ALTER TABLE savings_goals DROP COLUMN IF EXISTS user_id;
ALTER TABLE debts DROP COLUMN IF EXISTS user_id;
ALTER TABLE budgets DROP COLUMN IF EXISTS user_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS users CASCADE;
