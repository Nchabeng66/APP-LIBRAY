import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import 'dotenv/config';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 2 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${crypto.randomUUID()}-${safe}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
});

export const UPLOADS_ROOT = UPLOAD_DIR;