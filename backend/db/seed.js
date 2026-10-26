// backend/db/seed.js
import 'dotenv/config';
import { pool, query } from './pool.js';
import { ensureAdminAccount } from './admin.js';
import { ensureDefaultSettings } from './defaultSettings.js';

async function main() {
  await ensureDefaultSettings(query);

  await ensureAdminAccount(pool, {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Administrator',
    idNumber: process.env.ADMIN_ID_NUMBER || '0000000000',
  });

  console.log('Seed complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});