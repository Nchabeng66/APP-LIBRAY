// backend/db/seed.js
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { pool, query } from './pool.js';
import { ensureDefaultSettings } from './defaultSettings.js';

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function main() {
  await ensureDefaultSettings(query);

  const username = process.env.ADMIN_USERNAME;
  const rawPassword = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';
  const idNumber = process.env.ADMIN_ID_NUMBER || '0000000000';

  if (!username || !rawPassword) {
    console.warn('ADMIN_USERNAME / ADMIN_PASSWORD not set — skipping admin creation.');
  } else {
    const existing = await pool.query(
      "SELECT id FROM users WHERE role = 'Admin' LIMIT 1",
    );
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(rawPassword, 10);
      await pool.query(
        `INSERT INTO users (id, name, id_number, password_hash, role, status, username)
         VALUES ($1, $2, $3, $4, 'Admin', 'approved', $5)`,
        [id('us'), name, idNumber, hash, username],
      );
      console.log(`Admin "${username}" created.`);
    } else {
      console.log('Admin account already exists — skipping.');
    }
  }

  console.log('Seed complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});