const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { authenticate, publicUser } = require('./auth');
const {
  getStudents,
  getStudentById,
  saveStudent,
  listClasses,
  listHouses,
  listStaff,
  listFeeRecords,
  listAttendance,
  getVPData,
  saveVPData,
  createFeeRecord,
  createAttendanceRecord,
  createStaffMember,
  createClassItem,
  createHouseEntry,
  createVpRecord,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
app.use(session({
  name: 'school.sid',
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir, table: 'sessions' }),
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use('/api', (req, res, next) => {
  const origin = req.get('origin');
  if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
    return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
  }
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' }
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };
}

function requireAjaxHeader(req, res, next) {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'A same-origin request is required.' });
  }
  next();
}

app.use(express.static(rootDir));
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'School management API up.' });
});

app.post('/api/auth/login', loginLimiter, requireAjaxHeader, (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const user = authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.user = user;
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.json({ user: publicUser(user) });
    });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required.' });
  res.json({ user: publicUser(req.session.user) });
});

app.post('/api/auth/logout', requireAjaxHeader, requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('school.sid', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.status(204).end();
  });
});

app.get('/api/students', requireRole('principal', 'admin', 'vp_admin', 'academics', 'dean', 'bursar', 'hostel', 'teacher'), (req, res) => {
  res.json(getStudents());
});

app.get('/api/students/:id', requireRole('principal', 'admin', 'vp_admin', 'academics', 'dean', 'bursar', 'hostel', 'teacher'), (req, res) => {
  const student = getStudentById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  res.json(student);
});

app.post('/api/students', requireAjaxHeader, requireRole('principal', 'admin'), (req, res) => {
  const student = req.body;
  if (!student || typeof student.id !== 'string' || !student.id.trim() || typeof student.name !== 'string' || !student.name.trim()) {
    return res.status(400).json({ error: 'Student id and name are required.' });
  }
  const saved = saveStudent({
    id: student.id.trim(), name: student.name.trim(),
    class_name: student.class_name || '', house: student.house || '', state: student.state || '',
    fee_status: student.fee_status || 'Due', attendance: Number(student.attendance || 0),
    status: student.status || 'Boarding', jamb_score: student.jamb_score || '—', notes: student.notes || ''
  });
  res.status(201).json(saved);
});

app.put('/api/students/:id', requireAjaxHeader, requireRole('principal', 'admin'), (req, res) => {
  const existing = getStudentById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found.' });
  const student = { ...existing, ...req.body, id: req.params.id };
  if (typeof student.name !== 'string' || !student.name.trim()) return res.status(400).json({ error: 'Student name is required.' });
  const attendance = Number(student.attendance);
  if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) {
    return res.status(400).json({ error: 'Attendance must be between 0 and 100.' });
  }
  res.json(saveStudent({ ...student, name: student.name.trim(), attendance }));
});

app.get('/api/classes', requireRole('principal', 'admin', 'vp_admin', 'academics', 'dean', 'teacher'), (req, res) => {
  res.json(listClasses());
});

app.post('/api/classes', requireAjaxHeader, requireRole('principal', 'admin'), (req, res) => {
  if (!req.body || !req.body.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'Class name is required.' });
  }
  const created = createClassItem({
    name: String(req.body.name).trim(),
    level: String(req.body.level || ''),
    teacher: String(req.body.teacher || '')
  });
  res.status(201).json(created);
});

app.get('/api/houses', requireRole('principal', 'admin', 'hostel', 'bursar'), (req, res) => {
  res.json(listHouses());
});

app.post('/api/houses', requireAjaxHeader, requireRole('principal', 'admin', 'hostel'), (req, res) => {
  if (!req.body || !req.body.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'House name is required.' });
  }
  const created = createHouseEntry({
    name: String(req.body.name).trim(),
    capacity: Number(req.body.capacity || 0),
    occupancy: Number(req.body.occupancy || 0)
  });
  res.status(201).json(created);
});

app.get('/api/staff', requireRole('principal', 'admin', 'vp_admin', 'academics', 'dean', 'teacher'), (req, res) => {
  res.json(listStaff());
});

app.post('/api/staff', requireAjaxHeader, requireRole('principal', 'admin'), (req, res) => {
  if (!req.body || !req.body.name || !String(req.body.name).trim()) {
    return res.status(400).json({ error: 'Staff name is required.' });
  }
  const created = createStaffMember({
    name: String(req.body.name).trim(),
    role: String(req.body.role || ''),
    department: String(req.body.department || ''),
    phone: String(req.body.phone || ''),
    salary: Number(req.body.salary || 0)
  });
  res.status(201).json(created);
});

app.get('/api/fees', requireRole('principal', 'admin', 'bursar', 'teacher'), (req, res) => {
  res.json(listFeeRecords());
});

app.post('/api/fees', requireAjaxHeader, requireRole('principal', 'admin', 'bursar'), (req, res) => {
  if (!req.body || !req.body.student_id || !req.body.student_name) {
    return res.status(400).json({ error: 'Student id and name are required.' });
  }
  const created = createFeeRecord({
    student_id: String(req.body.student_id).trim(),
    student_name: String(req.body.student_name).trim(),
    amount: Number(req.body.amount || 0),
    status: String(req.body.status || 'Due'),
    due_date: req.body.due_date || null,
    notes: String(req.body.notes || '')
  });
  res.status(201).json(created);
});

app.get('/api/attendance', requireRole('principal', 'admin', 'academics', 'dean', 'teacher'), (req, res) => {
  res.json(listAttendance());
});

app.post('/api/attendance', requireAjaxHeader, requireRole('principal', 'admin', 'teacher', 'academics'), (req, res) => {
  if (!req.body || !req.body.student_id || !req.body.student_name || !req.body.date) {
    return res.status(400).json({ error: 'Student id, name, and date are required.' });
  }
  const created = createAttendanceRecord({
    student_id: String(req.body.student_id).trim(),
    student_name: String(req.body.student_name).trim(),
    date: String(req.body.date),
    present: Number(req.body.present || 0),
    notes: String(req.body.notes || '')
  });
  res.status(201).json(created);
});

app.get('/api/vp', requireRole('principal', 'admin', 'vp_admin'), (req, res) => {
  res.json(getVPData());
});

app.post('/api/vp', requireAjaxHeader, requireRole('principal', 'admin', 'vp_admin'), (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A VP data object is required.' });
  }
  res.json(saveVPData(req.body));
});

app.post('/api/vp/records', requireAjaxHeader, requireRole('principal', 'admin', 'vp_admin'), (req, res) => {
  if (!req.body || !req.body.title || !String(req.body.title).trim()) {
    return res.status(400).json({ error: 'A record title is required.' });
  }
  const created = createVpRecord({
    title: String(req.body.title).trim(),
    category: String(req.body.category || ''),
    date: String(req.body.date || ''),
    details: String(req.body.details || '')
  });
  res.status(201).json(created);
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.get('/*', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.use((error, req, res, next) => {
  console.error('Request failed:', error.message);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`School management API running on http://localhost:${PORT}`));
}

module.exports = app;
