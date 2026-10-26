import { Router } from 'express';
import { query } from '../db/pool.js';
import { ensureDefaultSettings } from '../db/defaultSettings.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Returns every config value the frontend needs. No business data is hardcoded
// in the React app — it all comes from here.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    await ensureDefaultSettings(query);
    const { rows } = await query('SELECT key, value FROM app_settings');
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({
      districts: map.districts || [],
      minAge: map.minAge ?? null,
      borrowDays: map.borrowDays ?? null,
      maxBorrowed: map.maxBorrowed ?? null,
      roles: map.roles || [],
    });
  }),
);

export default router;