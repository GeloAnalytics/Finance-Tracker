import pool from '../db/connection';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run promote-user -- user@example.com');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = 'admin', updated_at = NOW()
       WHERE LOWER(email) = $1
       RETURNING id, username, email, role`,
      [email]
    );
    if (result.rows.length === 0) {
      console.error(`No user found for ${email}`);
      process.exitCode = 1;
    } else {
      console.log(`Promoted ${result.rows[0].email} (${result.rows[0].username}) to ${result.rows[0].role}.`);
    }
  } finally {
    await pool.end();
  }
}

void main();
