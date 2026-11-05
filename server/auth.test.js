const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { authenticate, publicUser, ALLOWED_ROLES } = require('./auth');

test('authenticate accepts only allowed roles and valid hashes', () => {
  db.prepare('DELETE FROM users').run();
  const password = 'S3curePassword!2026';
  const hash = bcrypt.hashSync(password, 12);

  db.prepare('INSERT INTO users (email, password, role, display_name) VALUES (?, ?, ?, ?)')
    .run('principal@example.edu', hash, 'principal', 'Principal');

  const user = authenticate('principal@example.edu', password);
  assert.ok(user);
  assert.equal(user.email, 'principal@example.edu');
  assert.equal(user.role, 'principal');
  assert.equal(publicUser(user).password, undefined);
  assert.ok(ALLOWED_ROLES.has('principal'));
  assert.equal(authenticate('principal@example.edu', 'wrong-password'), null);
});

test('authenticate rejects unsupported roles and missing users', () => {
  db.prepare('DELETE FROM users').run();
  db.prepare('INSERT INTO users (email, password, role, display_name) VALUES (?, ?, ?, ?)')
    .run('temp@example.edu', bcrypt.hashSync('Passw0rd!321', 12), 'guest', 'Guest');

  assert.equal(authenticate('temp@example.edu', 'Passw0rd!321'), null);
  assert.equal(authenticate('missing@example.edu', 'anything'), null);
});
