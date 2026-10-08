-- FinanceWise Database Schema (Multi-User Production Baseline)

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories (pre-seeded with common finance categories)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
    budget_group VARCHAR(30) CHECK (budget_group IN ('needs', 'wants', 'tithes', 'savings', 'debt_payments'))
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Budgets (monthly per category per user)
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, category_id, month, year)
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
    current_balance DECIMAL(12,2) NOT NULL CHECK (current_balance >= 0),
    interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
    minimum_payment DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
    due_date INTEGER CHECK (due_date BETWEEN 1 AND 31),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
    deadline DATE,
    icon VARCHAR(10) DEFAULT '🎯',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bills and Shopping Items (Things to Pay & Things to Buy)
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

-- User Custom Budget Allocations
CREATE TABLE IF NOT EXISTS user_budget_allocations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_key VARCHAR(30) NOT NULL CHECK (group_key IN ('needs', 'wants', 'tithes', 'savings', 'debt_payments')),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, group_key)
);

-- Chat Messages (advisor history)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'advisor')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Access Log (support & security audit)
CREATE TABLE IF NOT EXISTS admin_access_log (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_items_user ON bills_and_items(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_items_type ON bills_and_items(item_type);
CREATE INDEX IF NOT EXISTS idx_bills_items_status ON bills_and_items(status);
CREATE INDEX IF NOT EXISTS idx_user_budget_allocations_user ON user_budget_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
