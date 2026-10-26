import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

function rowToOnline(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: row.genre,
    url: row.url,
    createdAt: row.created_at,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM online_books ORDER BY created_at DESC');
    res.json(rows.map(rowToOnline));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, author, genre, url } = req.body;
    if (!title || !author || !genre || !url) {
      return res.status(400).json({ error: 'Title, author, genre and URL are required.' });
    }
    const id = `ob-${crypto.randomUUID()}`;
    const { rows } = await query(
      `INSERT INTO online_books (id, title, author, genre, url)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, title.trim(), author.trim(), genre.trim(), url.trim()],
    );
    res.status(201).json(rowToOnline(rows[0]));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { title, author, genre, url } = req.body;
    const { rows } = await query(
      `UPDATE online_books
       SET title = COALESCE($2, title),
           author = COALESCE($3, author),
           genre = COALESCE($4, genre),
           url = COALESCE($5, url)
       WHERE id = $1 RETURNING *`,
      [req.params.id, title ?? null, author ?? null, genre ?? null, url ?? null],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Online book not found.' });
    res.json(rowToOnline(rows[0]));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM online_books WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Online book not found.' });
    res.status(204).end();
  }),
);

export default router;