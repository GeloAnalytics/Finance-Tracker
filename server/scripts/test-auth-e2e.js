const { app } = require('../dist/app');
const pool = require('../dist/db/connection').default;
const request = require('supertest');

async function main() {
  const username = 'testuser_' + Math.floor(Math.random() * 100000);
  const email = `${username}@example.com`;
  const password = 'SecretPassword123!';

  console.log(`Testing registration for ${username} (${email})...`);
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password });

  console.log('Registration status:', regRes.status);
  console.log('Registration body:', regRes.body);

  if (regRes.status !== 201) {
    throw new Error('Registration failed: ' + JSON.stringify(regRes.body));
  }

  const token = regRes.body.token;
  if (!token) {
    throw new Error('No token returned on registration!');
  }

  console.log('Testing /api/auth/me with Bearer token...');
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  console.log('/api/auth/me status:', meRes.status);
  console.log('/api/auth/me body:', meRes.body);

  if (!meRes.body.authenticated || meRes.body.user.email !== email) {
    throw new Error('Me check failed!');
  }

  console.log('Testing login with identifier and password...');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password });

  console.log('Login status:', loginRes.status);
  console.log('Login body:', loginRes.body);

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
  }

  console.log('Testing creating a transaction with the logged in user...');
  const txRes = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${loginRes.body.token}`)
    .send({
      type: 'expense',
      amount: 45.50,
      description: 'Test coffee expense',
      date: new Date().toISOString().split('T')[0],
      category_id: 8,
    });

  console.log('Transaction creation status:', txRes.status);
  console.log('Transaction body:', txRes.body);

  if (txRes.status !== 201) {
    throw new Error('Create transaction failed: ' + JSON.stringify(txRes.body));
  }

  console.log('✅ ALL LIVE AUTH AND DATA ACCESS TESTS PASSED!');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ E2E TEST FAILED:', err);
  pool.end();
  process.exit(1);
});
