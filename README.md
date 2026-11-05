# School management system

This project includes a SQLite-backed backend and a static web frontend.

## Run locally

1. Install dependencies with `npm install`.
2. Configure the first administrator credentials and a session secret (see below).
3. Start the server with `npm start`.
4. Open `http://localhost:3000`.

Do not use the former public demo credentials. The hardcoded demo users are removed during startup. To create the initial administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before starting the server; the password must be at least 12 characters. The account is created only when that email does not already exist. Create additional users through a controlled administrative process; there is no public registration endpoint.

Set a stable, random `SESSION_SECRET` in production and run behind HTTPS. If TLS terminates at a trusted reverse proxy, set `TRUST_PROXY=1`. Sessions are stored in SQLite under `data/sessions.sqlite`, cookies are HTTP-only and same-site strict, and sign-in attempts are rate limited.

Example for a local shell (choose your own unique password and secret):

```sh
ADMIN_EMAIL=admin@example.edu ADMIN_PASSWORD='use-a-unique-password-of-at-least-12-characters' SESSION_SECRET='replace-with-a-long-random-secret' npm start
```

## Tech stack
- Node.js + Express
- SQLite via better-sqlite3
- SQLite-backed sessions
- Static HTML/CSS/JS frontend

## API
- `GET /api/health` — public health check
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` — session authentication
- `GET /api/students`, `GET /api/students/:id` — authenticated school staff
- `POST /api/students`, `PUT /api/students/:id` — principal/admin only
- `GET /api/vp`, `POST /api/vp` — principal/admin/VP administration only

Write requests and login require the same-origin `X-Requested-With: XMLHttpRequest` header. The API does not enable cross-origin access. Passwords are stored as bcrypt hashes; the prototype's known demo accounts are removed at startup.

## Tests
Run `npm test`.
