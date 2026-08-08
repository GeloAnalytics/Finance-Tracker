// Usage: npm run hash-password -- "your-password"
// Prints a bcrypt hash suitable for the AUTH_PASSWORD_HASH env var.
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
