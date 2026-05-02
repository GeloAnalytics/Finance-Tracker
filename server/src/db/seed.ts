import pool from './connection';
import fs from 'fs';
import path from 'path';

async function seed() {
  const client = await pool.connect();
  try {
    // Run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    // For ts runtime, adjust path
    const schemaSQL = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'db', 'schema.sql'),
      'utf-8'
    );

    // Remove the CREATE DATABASE and \c lines (run those manually)
    const filteredSQL = schemaSQL
      .split('\n')
      .filter(line => !line.startsWith('CREATE DATABASE') && !line.startsWith('\\c'))
      .join('\n');

    await client.query(filteredSQL);
    console.log('✅ Schema created successfully');

    // Seed categories
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

    // Check if categories already exist
    const existing = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(existing.rows[0].count) === 0) {
      for (const cat of categories) {
        await client.query(
          'INSERT INTO categories (name, icon, type, budget_group) VALUES ($1, $2, $3, $4)',
          [cat.name, cat.icon, cat.type, cat.budget_group]
        );
      }
      console.log(`✅ Seeded ${categories.length} categories`);
    } else {
      console.log('ℹ️  Categories already exist, skipping seed');
    }

    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
