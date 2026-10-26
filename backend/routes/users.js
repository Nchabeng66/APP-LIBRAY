import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { publicUser } from './auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

async function nextMembershipId() {
  const { rows } = await query(
    `SELECT membership_id FROM users WHERE membership_id IS NOT NULL`,
  );
  const numbers = rows
    .map((r) => parseInt(String(r.membership_id).replace('MEM-', ''), 10))
    .filter((n) => !Number.isNaN(n));
  let candidate = (numbers.length ? Math.max(...numbers) : 1000) + 1;
  while (rows.some((r) => r.membership_id === `MEM-${candidate}`)) candidate += 1;
  return `MEM-${candidate}`;
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(rows.map(publicUser));
  }),
);

// Public signup → status pending, no membership ID yet.
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, idNumber, age, district, address, password } = req.body;
    if (!name || !idNumber || !password) {
      return res.status(400).json({ error: 'Name, ID number and password are required.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = `us-${crypto.randomUUID()}`;
    try {
      const { rows } = await query(
        `INSERT INTO users (id, name, id_number, password_hash, role, status, age, district, address)
         VALUES ($1,$2,$3,$4,'Member','pending',$5,$6,$7) RETURNING *`,
        [id, name.trim(), idNumber.trim(), hash, age ?? null, district ?? null, address ?? null],
      );
      res.status(201).json(publicUser(rows[0]));
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'An account with this ID number already exists.' });
      throw err;
    }
  }),
);

// Admin creates an approved user directly.
router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, idNumber, role = 'Member', password } = req.body;
    if (!name || !idNumber || !password) {
      return res.status(400).json({ error: 'Name, ID number and password are required.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = `us-${crypto.randomUUID()}`;
    const membershipId = role === 'Member' ? await nextMembershipId() : null;

    try {
      const { rows } = await query(
        `INSERT INTO users (id, name, id_number, password_hash, role, status, membership_id)
         VALUES ($1,$2,$3,$4,$5,'approved',$6) RETURNING *`,
        [id, name.trim(), idNumber.trim(), hash, role, membershipId],
      );
      res.status(201).json(publicUser(rows[0]));
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'That ID number is already registered.' });
      throw err;
    }
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, idNumber, role, password, status } = req.body;

    // Build the update dynamically so we never clobber a hash by accident.
    const fields = [];
    const values = [req.params.id];
    let i = 2;

    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name.trim()); }
    if (idNumber !== undefined) { fields.push(`id_number = $${i++}`); values.push(idNumber.trim()); }
    if (role !== undefined) { fields.push(`role = $${i++}`); values.push(role); }
    if (status !== undefined) { fields.push(`status = $${i++}`); values.push(status); }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${i++}`);
      values.push(hash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const { rows } = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(rows[0]));
  }),
);

router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1 AND role <> $2', [
      req.params.id,
      'Admin',
    ]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found or is an Admin.' });
    res.status(204).end();
  }),
);

router.post(
  '/:id/approve',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const membershipId = await nextMembershipId();
    const { rows } = await query(
      `UPDATE users SET status = 'approved', membership_id = $2
       WHERE id = $1 RETURNING *`,
      [req.params.id, membershipId],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(rows[0]));
  }),
);

router.post(
  '/:id/reject',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `UPDATE users SET status = 'rejected' WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(publicUser(rows[0]));
  }),
);

export default router;