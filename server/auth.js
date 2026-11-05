const bcrypt = require('bcryptjs');
const { db } = require('./db');

const DEMO_EMAILS = [
  'principal@vaatiacollege.com.ng',
  'teacher@vaatiacollege.com.ng',
  'parent@vaatiacollege.com.ng',
  'admin@vaatiacollege.com.ng',
  'vpadmin@vaatiacollege.com.ng',
  'academics@vaatiacollege.com.ng',
  'dean@vaatiacollege.com.ng',
  'bursar@vaatiacollege.com.ng',
  'hostel@vaatiacollege.com.ng'
];

const ALLOWED_ROLES = new Set([
  'principal', 'admin', 'vp_admin', 'academics', 'dean',
  'bursar', 'hostel', 'teacher', 'parent'
]);

function initializeAuth() {
  // Remove accounts and credentials that were hardcoded for the public demo.
  const removeDemo = db.prepare('DELETE FROM users WHERE lower(email) = ?');
  for (const email of DEMO_EMAILS) removeDemo.run(email);

  // Existing deployments may have users created by the original prototype,
  // which stored plaintext passwords. Hash them during the one-time migration.
  const users = db.prepare('SELECT id, password FROM users').all();
  const updatePassword = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  for (const user of users) {
    if (!/^\$2[aby]\$/.test(user.password)) {
      updatePassword.run(bcrypt.hashSync(user.password, 12), user.id);
    }
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (email && password) {
    if (password.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
    }
    db.prepare(`INSERT OR IGNORE INTO users (email, password, role, display_name)
      VALUES (?, ?, 'admin', 'School Administrator')`)
      .run(email, bcrypt.hashSync(password, 12));
  }
}

initializeAuth();

function authenticate(email, password) {
  const user = db.prepare('SELECT id, email, password, role, display_name FROM users WHERE email = ?')
    .get(String(email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password)) return null;
  if (!ALLOWED_ROLES.has(user.role)) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function publicUser(user) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

module.exports = { authenticate, publicUser, ALLOWED_ROLES };
