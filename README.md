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

Implementation and installation instructions will be added here.

## Environment

Copy backend/.env.example to backend/.env and configure
your PostgreSQL credentials before starting the backend.

For a separately hosted frontend, set `VITE_API_BASE` in the frontend build
environment to the backend URL ending in `/api` (for example,
`https://app-libray.onrender.com/api`). This setting is read at build time.
When running the frontend locally, leave it unset to use the Vite proxy to
`http://localhost:5000`.

Never commit backend/.env or real passwords to Git.
