import { Router } from 'express';
import crypto from 'node:crypto';
import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

function rowToTx(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    type: row.type,
    quantity: row.quantity,
    resultingStock: row.resulting_stock,
    note: row.note,
    memberId: row.member_id,
    memberName: row.member_name,
    dueDate: row.due_date,
    returnedAt: row.returned_at,
    date: row.date,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(rows.map(rowToTx));
  }),
);

// Staff: manual stock add/deduct.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { bookId, type, quantity, note } = req.body;
    if (!bookId || !type || !quantity) {
      return res.status(400).json({ error: 'bookId, type and quantity are required.' });
    }
    if (!['add', 'deduct'].includes(type) || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Invalid type or quantity.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const bookRes = await client.query('SELECT * FROM books WHERE id = $1 FOR UPDATE', [bookId]);
      const book = bookRes.rows[0];
      if (!book) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Book not found.' });
      }

      const delta = type === 'add' ? Number(quantity) : -Number(quantity);
      const resulting = Number(book.quantity) + delta;
      if (resulting < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Only ${book.quantity} in stock.` });
      }

      const bookUpdate = await client.query(
        'UPDATE books SET quantity = $2 WHERE id = $1 RETURNING *',
        [bookId, resulting],
      );

      const txId = `tx-${crypto.randomUUID()}`;
      const txRes = await client.query(
        `INSERT INTO transactions (id, book_id, book_title, type, quantity, resulting_stock, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [txId, bookId, book.title, type, Number(quantity), resulting, note || ''],
      );

      await client.query('COMMIT');

      const updatedBook = bookUpdate.rows[0];
      res.status(201).json({
        transaction: rowToTx(txRes.rows[0]),
        book: {
          id: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.author,
          genre: updatedBook.genre,
          isbn: updatedBook.isbn,
          quantity: updatedBook.quantity,
          price: Number(updatedBook.price),
          fileName: updatedBook.file_name,
          filePath: updatedBook.file_path,
          fileType: updatedBook.file_type,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

// Member: place an order (borrow). Deducts 1 copy.
router.post(
  '/order',
  asyncHandler(async (req, res) => {
    const { bookId, memberId } = req.body;
    if (!bookId || !memberId) return res.status(400).json({ error: 'bookId and memberId are required.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Load rules from app_settings — nothing hardcoded.
      const rulesRes = await client.query(
        `SELECT key, value FROM app_settings WHERE key IN ('borrowDays','maxBorrowed')`,
      );
      const rules = Object.fromEntries(rulesRes.rows.map((r) => [r.key, r.value]));
      const borrowDays = Number(rules.borrowDays) || 14;
      const maxBorrowed = Number(rules.maxBorrowed) || 3;

      const memberRes = await client.query('SELECT * FROM users WHERE id = $1', [memberId]);
      const member = memberRes.rows[0];
      if (!member) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Member not found.' });
      }

      const activeRes = await client.query(
        `SELECT COUNT(*)::int AS n FROM transactions
         WHERE member_id = $1 AND type = 'deduct' AND returned_at IS NULL`,
        [memberId],
      );
      if (activeRes.rows[0].n >= maxBorrowed) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `You already have ${maxBorrowed} books out.` });
      }

      const bookRes = await client.query('SELECT * FROM books WHERE id = $1 FOR UPDATE', [bookId]);
      const book = bookRes.rows[0];
      if (!book) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Book not found.' });
      }
      if (Number(book.quantity) < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'That book is out of stock.' });
      }

      const dueDate = new Date(Date.now() + borrowDays * 24 * 60 * 60 * 1000).toISOString();
      const newQty = Number(book.quantity) - 1;

      const bookUpdate = await client.query(
        'UPDATE books SET quantity = $2 WHERE id = $1 RETURNING *',
        [bookId, newQty],
      );

      const txId = `tx-${crypto.randomUUID()}`;
      const txRes = await client.query(
        `INSERT INTO transactions
         (id, book_id, book_title, type, quantity, resulting_stock, note, member_id, member_name, due_date)
         VALUES ($1,$2,$3,'deduct',1,$4,$5,$6,$7,$8) RETURNING *`,
        [txId, bookId, book.title, newQty, `Ordered by ${member.name}`, member.id, member.name, dueDate],
      );

      await client.query('COMMIT');
      const updatedBook = bookUpdate.rows[0];

      res.status(201).json({
        transaction: rowToTx(txRes.rows[0]),
        book: {
          id: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.author,
          genre: updatedBook.genre,
          isbn: updatedBook.isbn,
          quantity: updatedBook.quantity,
          price: Number(updatedBook.price),
          fileName: updatedBook.file_name,
          filePath: updatedBook.file_path,
          fileType: updatedBook.file_type,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

// Return a loan: marks the original transaction returned and adds a stock-in entry.
router.post(
  '/:id/return',
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const txRes = await client.query('SELECT * FROM transactions WHERE id = $1 FOR UPDATE', [
        req.params.id,
      ]);
      const loan = txRes.rows[0];
      if (!loan) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Loan not found.' });
      }
      if (loan.returned_at) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'This loan has already been returned.' });
      }

      const bookRes = await client.query('SELECT * FROM books WHERE id = $1 FOR UPDATE', [
        loan.book_id,
      ]);
      const book = bookRes.rows[0];
      if (!book) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Book no longer exists.' });
      }

      const now = new Date().toISOString();
      const updatedLoanRes = await client.query(
        'UPDATE transactions SET returned_at = $2 WHERE id = $1 RETURNING *',
        [loan.id, now],
      );

      const newQty = Number(book.quantity) + 1;
      const bookUpdate = await client.query(
        'UPDATE books SET quantity = $2 WHERE id = $1 RETURNING *',
        [book.id, newQty],
      );

      const returnTxId = `tx-${crypto.randomUUID()}`;
      const returnTxRes = await client.query(
        `INSERT INTO transactions
         (id, book_id, book_title, type, quantity, resulting_stock, note, member_id, member_name)
         VALUES ($1,$2,$3,'add',1,$4,$5,$6,$7) RETURNING *`,
        [
          returnTxId,
          book.id,
          book.title,
          newQty,
          `Returned by ${loan.member_name || 'member'}`,
          loan.member_id,
          loan.member_name,
        ],
      );

      await client.query('COMMIT');
      const updatedBook = bookUpdate.rows[0];

      res.json({
        loan: rowToTx(updatedLoanRes.rows[0]),
        returnTransaction: rowToTx(returnTxRes.rows[0]),
        book: {
          id: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.author,
          genre: updatedBook.genre,
          isbn: updatedBook.isbn,
          quantity: updatedBook.quantity,
          price: Number(updatedBook.price),
          fileName: updatedBook.file_name,
          filePath: updatedBook.file_path,
          fileType: updatedBook.file_type,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }),
);

export default router;