import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';

const router = Router();

function rowToBook(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: row.genre,
    isbn: row.isbn,
    quantity: row.quantity,
    price: Number(row.price),
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    createdAt: row.created_at,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM books ORDER BY created_at DESC');
    res.json(rows.map(rowToBook));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, author, genre, isbn, quantity, price } = req.body;
    if (!title || !author || !genre || !isbn) {
      return res.status(400).json({ error: 'Title, author, genre and ISBN are required.' });
    }

    const id = `bk-${crypto.randomUUID()}`;
    try {
      const { rows } = await query(
        `INSERT INTO books (id, title, author, genre, isbn, quantity, price)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, title.trim(), author.trim(), genre.trim(), isbn.trim(), Number(quantity) || 0, Number(price) || 0],
      );
      res.status(201).json(rowToBook(rows[0]));
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'A book with this ISBN already exists.' });
      throw err;
    }
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { title, author, genre, isbn, quantity, price } = req.body;
    const { rows } = await query(
      `UPDATE books
       SET title = COALESCE($2, title),
           author = COALESCE($3, author),
           genre = COALESCE($4, genre),
           isbn = COALESCE($5, isbn),
           quantity = COALESCE($6, quantity),
           price = COALESCE($7, price)
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        title ?? null,
        author ?? null,
        genre ?? null,
        isbn ?? null,
        quantity != null ? Number(quantity) : null,
        price != null ? Number(price) : null,
      ],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Book not found.' });
    res.json(rowToBook(rows[0]));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM books WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Book not found.' });
    res.status(204).end();
  }),
);

// Upload / replace the book file.
router.post(
  '/:id/file',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const publicPath = `/uploads/${req.file.filename}`;
    const { rows } = await query(
      `UPDATE books SET file_name = $2, file_path = $3, file_type = $4
       WHERE id = $1 RETURNING *`,
      [req.params.id, req.file.originalname, publicPath, req.file.mimetype],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Book not found.' });
    res.json(rowToBook(rows[0]));
  }),
);

export default router;