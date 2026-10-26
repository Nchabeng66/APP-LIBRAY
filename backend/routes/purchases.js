import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';

const router = Router();

function rowToPurchase(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    userId: row.user_id,
    userName: row.user_name,
    amount: Number(row.amount),
    status: row.status,
    proofFileName: row.proof_file_name,
    proofFileType: row.proof_file_type,
    proofFilePath: row.proof_file_path,
    requestedAt: row.requested_at,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM purchases ORDER BY requested_at DESC');
    res.json(rows.map(rowToPurchase));
  }),
);

// A member submits proof of payment. File is optional in form-data.
router.post(
  '/',
  upload.single('proof'),
  asyncHandler(async (req, res) => {
    const { bookId, bookTitle, userId, userName, amount } = req.body;
    if (!bookId || !userId) {
      return res.status(400).json({ error: 'bookId and userId are required.' });
    }

    const id = `pu-${crypto.randomUUID()}`;
    const publicPath = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await query(
      `INSERT INTO purchases
       (id, book_id, book_title, user_id, user_name, amount, status,
        proof_file_name, proof_file_type, proof_file_path)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9) RETURNING *`,
      [
        id,
        bookId,
        bookTitle || '',
        userId,
        userName || '',
        Number(amount) || 0,
        req.file?.originalname || null,
        req.file?.mimetype || null,
        publicPath,
      ],
    );
    res.status(201).json(rowToPurchase(rows[0]));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const { rows } = await query(
      'UPDATE purchases SET status = $2 WHERE id = $1 RETURNING *',
      [req.params.id, status],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Purchase not found.' });
    res.json(rowToPurchase(rows[0]));
  }),
);

export default router;