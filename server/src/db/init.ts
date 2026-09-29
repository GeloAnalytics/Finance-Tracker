import bcrypt from 'bcryptjs';
import pool from './connection';

/**
 * Auto-initialize the database:
 * 1. Test connectivity
 * 2. Create tables if they don't exist
 * 3. Seed categories if empty
 *
 * Schema changes now belong in migrations/ (see `npm run migrate:create`),
 * not here — this stays only as a defensive fallback for a fresh boot before
 * migrations have been run, so it must keep matching the baseline migration.
 */
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── 1. Connectivity test ────────────────────────────────────────
    const result = await client.query('SELECT NOW() as now');
    console.log(`📦 Database connected at ${result.rows[0].now}`);

    // ── 2. Create tables ────────────────────────────────────────────
    await client.query(`
      -- Users table
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
    `);
    console.log('✅ Database tables verified / created');

    // Defensive upgrades for databases created before the role columns were
    // introduced. Production still applies the versioned migration first.
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'");
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');

    // Keep the password-only owner shortcut usable for local development. It
    // still resolves to a real users row, so foreign keys and user isolation
    // behave exactly like a normally registered account. Production uses the
    // explicit ADMIN_EMAIL/ADMIN_PASSWORD_HASH bootstrap below instead.
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && process.env.AUTH_PASSWORD) {
      const ownerEmail = 'owner@financewise.local';
      const owner = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2 LIMIT 1',
        [ownerEmail, 'owner']
      );
      if (owner.rows.length === 0) {
        const ownerHash = await bcrypt.hash(process.env.AUTH_PASSWORD, 10);
        await client.query(
          "INSERT INTO users (username, email, password_hash, role) VALUES ('owner', $1, $2, 'admin') ON CONFLICT DO NOTHING",
          [ownerEmail, ownerHash]
        );
        console.log('✅ Local owner account ensured');
      }
    }

    // Optional deployment bootstrap for the developer/support account. The
    // password is supplied only as a bcrypt hash through the environment.
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminHash = process.env.ADMIN_PASSWORD_HASH;
    const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'developer';
    if (adminEmail && adminHash) {
      const existingAdmin = await client.query('SELECT id FROM users WHERE LOWER(email) = $1', [adminEmail]);
      let adminId: number;
      if (existingAdmin.rows.length > 0) {
        adminId = existingAdmin.rows[0].id;
        await client.query(
          "UPDATE users SET role = 'admin', is_active = TRUE, updated_at = NOW() WHERE id = $1",
          [adminId]
        );
      } else {
        const insertedAdmin = await client.query(
          "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id",
          [adminUsername, adminEmail, adminHash]
        );
        adminId = insertedAdmin.rows[0].id;
      }
      // Older single-user deployments have rows with no owner. Claim those
      // rows for the explicitly configured developer account once, so they
      // remain available to support without becoming visible to new users.
      for (const table of ['transactions', 'budgets', 'debts', 'savings_goals', 'bills_and_items', 'user_budget_allocations', 'chat_messages']) {
        await client.query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [adminId]);
      }
      console.log(`✅ Administrator account ensured for ${adminEmail}`);
    }

    // ── 3. Seed categories if empty ─────────────────────────────────
    const existing = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(existing.rows[0].count) === 0) {
      const categories = [
        // Income categories
        { name: 'Salary', icon: '💼', type: 'income', budget_group: null },
        { name: 'Freelance', icon: '💻', type: 'income', budget_group: null },
        { name: 'Side Hustle', icon: '🔧', type: 'income', budget_group: null },
        { name: 'Gifts', icon: '🎁', type: 'both', budget_group: null },
        { name: 'Other Income', icon: '💵', type: 'income', budget_group: null },

        // Needs (50%)
        { name: 'Rent / Housing', icon: '🏠', type: 'expense', budget_group: 'needs' },
        { name: 'Groceries', icon: '🛒', type: 'expense', budget_group: 'needs' },
        { name: 'Utilities', icon: '💡', type: 'expense', budget_group: 'needs' },
        { name: 'Transportation', icon: '🚌', type: 'expense', budget_group: 'needs' },
        { name: 'Insurance', icon: '🛡️', type: 'expense', budget_group: 'needs' },
        { name: 'Healthcare', icon: '🏥', type: 'expense', budget_group: 'needs' },
        { name: 'Phone / Internet', icon: '📱', type: 'expense', budget_group: 'needs' },

        // Wants (30%)
        { name: 'Dining Out', icon: '🍕', type: 'expense', budget_group: 'wants' },
        { name: 'Entertainment', icon: '🎬', type: 'expense', budget_group: 'wants' },
        { name: 'Shopping', icon: '🛍️', type: 'expense', budget_group: 'wants' },
        { name: 'Subscriptions', icon: '📺', type: 'expense', budget_group: 'wants' },
        { name: 'Hobbies', icon: '🎮', type: 'expense', budget_group: 'wants' },
        { name: 'Personal Care', icon: '💅', type: 'expense', budget_group: 'wants' },
        { name: 'Travel', icon: '✈️', type: 'expense', budget_group: 'wants' },

        // Savings (20%)
        { name: 'Emergency Fund', icon: '🆘', type: 'expense', budget_group: 'savings' },
        { name: 'Investments', icon: '📈', type: 'expense', budget_group: 'savings' },
        { name: 'Debt Payment', icon: '💳', type: 'expense', budget_group: 'savings' },
        { name: 'Savings', icon: '🏦', type: 'expense', budget_group: 'savings' },
      ];

      for (const cat of categories) {
        await client.query(
          'INSERT INTO categories (name, icon, type, budget_group) VALUES ($1, $2, $3, $4)',
          [cat.name, cat.icon, cat.type, cat.budget_group]
        );
      }
      console.log(`✅ Seeded ${categories.length} categories`);
    } else {
      console.log(`ℹ️  Categories already exist (${existing.rows[0].count} found)`);
    }

    console.log('🎉 Database initialization complete!');
  } finally {
    client.release();
  }
}
