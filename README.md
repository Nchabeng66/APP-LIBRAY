# Library App

A library management application with a React/Vite frontend,
an Express backend, and a PostgreSQL database.

## Requirements

- Node.js and npm
- PostgreSQL
- PowerShell

## Project Structure

- frontend/ - React application
- backend/ - Express API and PostgreSQL configuration
- uploads/ - Uploaded files (not committed to Git)

## Setup

Configure `backend/.env` with `DATABASE_URL`, then start the backend from the
`backend/` directory with `npm start`. Startup creates the schema and seeds
default settings. Start the frontend from `frontend/` with `npm run dev`.

## Environment

Copy backend/.env.example to backend/.env and configure
your PostgreSQL credentials before starting the backend.

The backend reads `DATABASE_URL` from its environment. On startup it creates
any missing tables and inserts initial settings (including the district list)
without overwriting settings already stored in PostgreSQL. Keep `DATABASE_URL`
configured on the backend hosting service so application data persists in the
database. For Render, set the backend service root directory to `backend` and
use `npm start`; startup initializes the schema and fills missing default
settings before serving API requests. Set `ADMIN_USERNAME` and
`ADMIN_PASSWORD` in the backend service environment. Each startup creates or
updates the configured administrator password using bcrypt, so it matches the
credentials used on the admin login page. Do not insert an administrator with
a manually copied or placeholder password hash.

For a separately hosted frontend, set `VITE_API_BASE` in the frontend build
environment to the backend URL ending in `/api` (for example,
`https://app-libray.onrender.com/api`). The checked-in
`frontend/.env.production` contains the current production API URL. This
setting is read at build time.
When running the frontend locally, leave it unset to use the Vite proxy to
`http://localhost:5000`.

Never commit backend/.env or real passwords to Git.
