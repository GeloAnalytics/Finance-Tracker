-- Migration: Add Bills & To-Buy List + User Custom Budget Allocations

CREATE TABLE IF NOT EXISTS bills_and_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('bill', 'to_buy')),
    name VARCHAR(150) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    due_date DATE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_items_user ON bills_and_items(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_items_type ON bills_and_items(item_type);
CREATE INDEX IF NOT EXISTS idx_bills_items_status ON bills_and_items(status);

CREATE TABLE IF NOT EXISTS user_budget_allocations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_key VARCHAR(30) NOT NULL CHECK (group_key IN ('needs', 'wants', 'tithes', 'savings', 'debt_payments')),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, group_key)
);

CREATE INDEX IF NOT EXISTS idx_user_budget_allocations_user ON user_budget_allocations(user_id);

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_budget_group_check;
ALTER TABLE categories ADD CONSTRAINT categories_budget_group_check CHECK (budget_group IN ('needs', 'wants', 'tithes', 'savings', 'debt_payments'));

-- Down Migration

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_budget_group_check;
ALTER TABLE categories ADD CONSTRAINT categories_budget_group_check CHECK (budget_group IN ('needs', 'wants', 'savings'));

DROP INDEX IF EXISTS idx_user_budget_allocations_user;
DROP TABLE IF EXISTS user_budget_allocations CASCADE;

DROP INDEX IF EXISTS idx_bills_items_status;
DROP INDEX IF EXISTS idx_bills_items_type;
DROP INDEX IF EXISTS idx_bills_items_user;
DROP TABLE IF EXISTS bills_and_items CASCADE;
