# School management system

This project now includes a small SQLite-backed backend and a static web frontend.

## Run locally

1. Install dependencies:
   npm install
2. Start the server:
   npm start
3. Open:
   http://localhost:3000

Demo login:
- Email: principal@vaatiacollege.com.ng
- Password: nexus2026

## Tech stack
- Node.js + Express
- SQLite via better-sqlite3
- Static HTML/CSS/JS frontend

## Database location
- `data/school.db`

## API endpoints
- `GET /api/health`
- `GET /api/students`
- `POST /api/students`
- `GET /api/vp`
- `POST /api/vp`
