import bcrypt from 'bcryptjs';

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function ensureAdminAccount(pool, {
  username,
  password,
  name = 'Administrator',
  idNumber = '0000000000',
}) {
  if (!username || !password) {
    console.warn('ADMIN_USERNAME / ADMIN_PASSWORD not set — skipping admin synchronization.');
    return;
  }

  const configuredAccount = await pool.query(
    'SELECT id, role FROM users WHERE username = $1',
    [username],
  );
  if (configuredAccount.rows[0] && configuredAccount.rows[0].role !== 'Admin') {
    throw new Error(`Username "${username}" is already assigned to a non-admin account.`);
  }

  const existingAdmin = configuredAccount.rows[0] || (
    await pool.query(
      "SELECT id FROM users WHERE role = 'Admin' ORDER BY created_at ASC LIMIT 1",
    )
  ).rows[0];
  const passwordHash = await bcrypt.hash(password, 10);

  if (existingAdmin) {
    await pool.query(
      `UPDATE users
       SET name = $2, password_hash = $3, role = 'Admin',
           status = 'approved', username = $4
       WHERE id = $1`,
      [existingAdmin.id, name, passwordHash, username],
    );
    console.log(`Admin "${username}" credentials synchronized from environment.`);
    return;
  }

  await pool.query(
    `INSERT INTO users (id, name, id_number, password_hash, role, status, username)
     VALUES ($1, $2, $3, $4, 'Admin', 'approved', $5)`,
    [id('us'), name, idNumber, passwordHash, username],
  );
  console.log(`Admin "${username}" created.`);
}
