import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Member login: national ID number + password.
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { idNumber, password } = req.body;
    if (!idNumber || !password) {
      return res.status(400).json({ error: 'ID number and password are required.' });
    }

    const { rows } = await query('SELECT * FROM users WHERE id_number = $1', [idNumber.trim()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'not-found' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'bad-password' });

    if (user.status === 'pending') return res.status(403).json({ error: 'pending' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'rejected' });

    res.json({ user: publicUser(user) });
  }),
);

// Admin login: username + password.
router.post(
  '/admin-login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    const user = rows[0];
    if (!user || user.role !== 'Admin') {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect username or password.' });

    res.json({ user: publicUser(user) });
  }),
);

// Never return the password hash to the client.
export function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...safe } = u;
  return safe;
}

export default router;