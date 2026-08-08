#!/usr/bin/env node
// Thin wrapper around the node-pg-migrate CLI that derives a connection
// string from either DATABASE_URL (production/Render) or the discrete
// DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME vars (local dev), without
// setting DATABASE_URL in process.env permanently — connection.ts uses
// DATABASE_URL's presence to decide production vs local pool config, and
// this script must not change that for the app itself.
require('dotenv').config();
const { spawnSync } = require('child_process');

const env = { ...process.env };

if (!env.DATABASE_URL) {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'postgres',
    DB_PASSWORD = '',
    DB_NAME = 'financewise',
  } = process.env;
  env.DATABASE_URL = `postgres://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

const args = process.argv.slice(2);
const result = spawnSync('node-pg-migrate', args, { stdio: 'inherit', env, shell: true });
process.exit(result.status ?? 1);
