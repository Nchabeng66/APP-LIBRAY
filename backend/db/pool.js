import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and paste your Neon connection string.',
  );
}

// Neon URLs include ?sslmode=require&channel_binding=require.
// `pg` doesn't understand channel_binding, so strip it and force SSL.
function buildConfig(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.delete('channel_binding');

  const sslMode = url.searchParams.get('sslmode');
  const useSsl = sslMode !== 'disable';

  return {
    connectionString: url.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

export const pool = new Pool(buildConfig(connectionString));

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Fail fast at boot so a bad URL is caught immediately.
pool
  .query('SELECT 1')
  .then(() => console.log('✔ Connected to PostgreSQL'))
  .catch((err) => {
    console.error('✘ Could not connect to PostgreSQL:', err.message);
    process.exit(1);
  });

export function query(text, params) {
  return pool.query(text, params);
}