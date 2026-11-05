# School management system

SQLite-backed Node/Express API and a browser frontend for school operations.

## Run locally

1. Install dependencies: `npm install`.
2. Set the initial admin account environment variables below.
3. Run `npm start` and open `http://localhost:3000`.

```sh
ADMIN_EMAIL=admin@example.edu ADMIN_PASSWORD='use-a-unique-password-of-at-least-12-characters' SESSION_SECRET='replace-with-a-long-random-secret' npm start
```

The initial admin is created if that email is not already registered. Passwords are bcrypt-hashed. Public demo users and demo passwords have been removed. There is no public registration API; create staff accounts through a trusted, restricted administrative process. Existing demo records in the database are sample data and should be replaced before real use.

For production, use HTTPS and a stable, randomly generated `SESSION_SECRET`. Set `TRUST_PROXY=1` only when deployed behind a trusted TLS-terminating reverse proxy. Sessions are stored in `data/sessions.sqlite`, and the session cookie is HTTP-only, same-site strict, and secure in production.

## Features and access

- Student directory, search, add, and edit (principal/admin).
- Fee ledger and fee record entry (principal/admin/bursar).
- Attendance records and marking (principal/admin/teacher/academics).
- Staff directory and class management (principal/admin can create; designated school roles can view).
- Boarding house occupancy (principal/admin/hostel can create).
- VP administration events (principal/admin/VP administration).
- Session-backed authentication, role-checked APIs, sign-in rate limiting, and same-origin write checks.

Parents currently have a secure sign-in role but no linked ward data model; they see no student records until that association is implemented.

## API

- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- Students: `GET /api/students`, `GET /api/students/:id`, `POST /api/students`, `PUT /api/students/:id`
- Classes: `GET /api/classes`, `POST /api/classes`
- Boarding houses: `GET /api/houses`, `POST /api/houses`
- Staff: `GET /api/staff`, `POST /api/staff`
- Fees: `GET /api/fees`, `POST /api/fees`
- Attendance: `GET /api/attendance`, `POST /api/attendance`
- VP: `GET /api/vp`, `POST /api/vp`, `POST /api/vp/records`

Mutating requests and login require `X-Requested-With: XMLHttpRequest`. API routes are same-origin; do not expose the database directory through a reverse proxy.

## Tests

Run `npm test`.
