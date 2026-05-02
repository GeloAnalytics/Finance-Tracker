import pool from './connection';

/**
 * Auto-initialize the database:
 * 1. Test connectivity
 * 2. Create tables if they don't exist
 * 3. Seed categories if empty
 */
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── 1. Connectivity test ────────────────────────────────────────
    const result = await client.query('SELECT NOW() as now');
    console.log(`📦 Database connected at ${result.rows[0].now}`);

    // ── 2. Create tables ────────────────────────────────────────────
    await client.query(`
      -- Categories (pre-seeded with common finance categories)
      CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL,
          icon VARCHAR(10),
          type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
          budget_group VARCHAR(20) CHECK (budget_group IN ('needs', 'wants', 'savings'))
      );

      -- Transactions
      CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
          amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          description TEXT,
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Budgets (monthly per category)
      CREATE TABLE IF NOT EXISTS budgets (
          id SERIAL PRIMARY KEY,
          category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
          amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
          month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
          year INTEGER NOT NULL CHECK (year >= 2020),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(category_id, month, year)
      );

      -- Debts
      CREATE TABLE IF NOT EXISTS debts (
          id SERIAL PRIMARY KEY,
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
          name VARCHAR(100) NOT NULL,
          target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
          current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
          deadline DATE,
          icon VARCHAR(10) DEFAULT '🎯',
          is_completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Chat Messages (advisor history)
      CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'advisor')),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
    `);
    console.log('✅ Database tables verified / created');

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
