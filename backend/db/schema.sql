-- Run once to create tables. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  id_number      TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'Member',
  status         TEXT NOT NULL DEFAULT 'pending',
  membership_id  TEXT UNIQUE,
  age            INTEGER,
  district       TEXT,
  address        TEXT,
  username       TEXT UNIQUE,           -- only used by Admin accounts
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS books (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  genre       TEXT NOT NULL,
  isbn        TEXT UNIQUE NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  file_name   TEXT,
  file_path   TEXT,
  file_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS online_books (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  genre       TEXT NOT NULL,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  book_id          TEXT REFERENCES books(id) ON DELETE CASCADE,
  book_title       TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('add','deduct')),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  resulting_stock  INTEGER NOT NULL,
  note             TEXT,
  member_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  member_name      TEXT,
  due_date         TIMESTAMPTZ,
  returned_at      TIMESTAMPTZ,
  date             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id                TEXT PRIMARY KEY,
  book_id           TEXT REFERENCES books(id) ON DELETE CASCADE,
  book_title        TEXT NOT NULL,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_name         TEXT NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  proof_file_name   TEXT,
  proof_file_type   TEXT,
  proof_file_path   TEXT,
  requested_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_book   ON transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status    ON purchases(status);