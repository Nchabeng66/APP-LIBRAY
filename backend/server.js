import express from 'express';
import cors from 'cors';
import path from 'node:path';
import 'dotenv/config';

import { pool } from './db/pool.js';
import { ensureAdminAccount } from './db/admin.js';
import booksRouter from './routes/books.js';
import onlineBooksRouter from './routes/onlineBooks.js';
import usersRouter from './routes/users.js';
import transactionsRouter from './routes/transactions.js';
import purchasesRouter from './routes/purchases.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { UPLOADS_ROOT } from './middleware/upload.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(UPLOADS_ROOT)));

app.use('/api/books', booksRouter);
app.use('/api/online-books', onlineBooksRouter);
app.use('/api/users', usersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await ensureAdminAccount(pool, {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Administrator',
    idNumber: process.env.ADMIN_ID_NUMBER || '0000000000',
  });

  const server = app.listen(PORT, () => {
    console.log(`Library API listening on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Another process (possibly an old backend) is holding it. ` +
          `Find it with: Get-NetTCPConnection -LocalPort ${PORT}`,
      );
      process.exit(1);
    }
    throw err;
  });
}

startServer().catch((err) => {
  console.error('Could not initialize the administrator account:', err);
  process.exit(1);
});