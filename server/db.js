const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'school.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initialise() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      display_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class_name TEXT,
      house TEXT,
      state TEXT,
      fee_status TEXT,
      attendance INTEGER,
      status TEXT,
      jamb_score TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      level TEXT,
      teacher TEXT
    );

    CREATE TABLE IF NOT EXISTS houses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      capacity INTEGER DEFAULT 0,
      occupancy INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      department TEXT,
      phone TEXT,
      salary REAL
    );

    CREATE TABLE IF NOT EXISTS fee_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      date TEXT NOT NULL,
      present INTEGER NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS vp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      date TEXT,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS vp_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (!userCount.c) {
    db.prepare(`
      INSERT INTO users (email, password, role, display_name)
      VALUES (?, ?, ?, ?)
    `).run('principal@vaatiacollege.com.ng', 'nexus2026', 'admin', 'Mr. T.O. Vaatia');

    db.prepare(`
      INSERT INTO users (email, password, role, display_name)
      VALUES (?, ?, ?, ?)
    `).run('teacher@vaatiacollege.com.ng', 'nexus2026', 'teacher', 'Mr. T.T. Tyohuna');

    db.prepare(`
      INSERT INTO users (email, password, role, display_name)
      VALUES (?, ?, ?, ?)
    `).run('parent@vaatiacollege.com.ng', 'nexus2026', 'parent', 'Mrs. M. Terhemba');
  }

  const studentCount = db.prepare('SELECT COUNT(*) AS c FROM students').get();
  if (!studentCount.c) {
    const insert = db.prepare(`
      INSERT INTO students (id, name, class_name, house, state, fee_status, attendance, status, jamb_score, notes)
      VALUES (@id, @name, @class_name, @house, @state, @fee_status, @attendance, @status, @jamb_score, @notes)
    `);

    const seed = [
      { id: 'VCM/25/0142', name: 'Terhemba Doose', class_name: 'SSS 2 Science', house: 'Akume House', state: 'Benue', fee_status: 'Paid', attendance: 98, status: 'Boarding', jamb_score: '—', notes: 'Good conduct' },
      { id: 'VCM/25/0088', name: 'Aondohemba David', class_name: 'SSS 3 Science', house: 'Unity House', state: 'Benue', fee_status: 'Part', attendance: 96, status: 'Boarding', jamb_score: '328', notes: 'Needs fee follow-up' },
      { id: 'VCM/25/0211', name: 'Mlumun Faith', class_name: 'JSS 3', house: 'Service House', state: 'Benue', fee_status: 'Paid', attendance: 99, status: 'Boarding', jamb_score: '—', notes: 'Excellent attendance' },
      { id: 'VCM/24/0034', name: 'Shagba Emmanuel', class_name: 'SSS 3 Arts', house: 'Integrity House', state: 'Nasarawa', fee_status: 'Paid', attendance: 94, status: 'Boarding', jamb_score: '301', notes: 'Strong arts performance' },
      { id: 'VCM/25/0177', name: 'Eyioma Zion', class_name: 'JSS 2', house: 'Akume House', state: 'FCT', fee_status: 'Due', attendance: 97, status: 'Boarding', jamb_score: '—', notes: 'Fee reminder sent' },
      { id: 'VCM/23/0019', name: 'Sedoo Terfa', class_name: 'SSS 1 Science', house: 'Excellence House', state: 'Benue', fee_status: 'Paid', attendance: 100, status: 'Boarding', jamb_score: '—', notes: 'Top performer' },
      { id: 'VCM/25/0250', name: 'Kwaghgba Peter', class_name: 'JSS 1 / Basic 7', house: 'Unity House', state: 'Benue', fee_status: 'Paid', attendance: 95, status: 'Boarding', jamb_score: '—', notes: 'Transition good' },
      { id: 'VCM/24/0112', name: 'Nguhemen Ruth', class_name: 'SSS 2 Arts', house: 'Service House', state: 'Benue', fee_status: 'Paid', attendance: 93, status: 'Day request', jamb_score: '—', notes: 'Part-time student' }
    ];

    const tx = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    tx(seed);
  }

  const classCount = db.prepare('SELECT COUNT(*) AS c FROM classes').get();
  if (!classCount.c) {
    const classesSeed = [
      ['JSS 1A', 'JSS', 'Mr. T.T. Tyohuna'],
      ['JSS 1B', 'JSS', 'Mrs. V.U. Mashika'],
      ['JSS 2A', 'JSS', 'Mr. O. Pius'],
      ['SSS 1A', 'SSS', 'Mr. E.A. Otache'],
      ['SSS 2A', 'SSS', 'Mr. S. Takor'],
      ['SSS 3A', 'SSS', 'Mrs. R. Iorbee']
    ];
    const stmt = db.prepare('INSERT INTO classes (name, level, teacher) VALUES (?, ?, ?)');
    for (const row of classesSeed) stmt.run(row[0], row[1], row[2]);
  }

  const houseCount = db.prepare('SELECT COUNT(*) AS c FROM houses').get();
  if (!houseCount.c) {
    const housesSeed = [
      ['Akume House', 38, 32],
      ['Unity House', 42, 38],
      ['Service House', 40, 35],
      ['Integrity House', 36, 30],
      ['Excellence House', 44, 41]
    ];
    const stmt = db.prepare('INSERT INTO houses (name, capacity, occupancy) VALUES (?, ?, ?)');
    for (const row of housesSeed) stmt.run(row[0], row[1], row[2]);
  }

  const staffCount = db.prepare('SELECT COUNT(*) AS c FROM staff').get();
  if (!staffCount.c) {
    const staffSeed = [
      ['Mr. T.O. Vaatia', 'Principal', 'Administration', '08030000001', 850000],
      ['Mr. M.C. Itodo', 'Vice Principal', 'Administration', '08030000002', 620000],
      ['Mr. S.T. Dzapine', 'Vice Principal', 'Academics', '08030000003', 620000],
      ['Mr. O. Pius', 'Dean of Studies', 'Academics', '08030000004', 400000],
      ['Mr. T.T. Tyohuna', 'HOD Maths', 'Mathematics', '08030000005', 360000],
      ['Mrs. V.U. Mashika', 'HOD Languages', 'Languages', '08030000006', 360000]
    ];
    const stmt = db.prepare('INSERT INTO staff (name, role, department, phone, salary) VALUES (?, ?, ?, ?, ?)');
    for (const row of staffSeed) stmt.run(row[0], row[1], row[2], row[3], row[4]);
  }

  const feeCount = db.prepare('SELECT COUNT(*) AS c FROM fee_records').get();
  if (!feeCount.c) {
    const feeStmt = db.prepare('INSERT INTO fee_records (student_id, student_name, amount, status, due_date, notes) VALUES (?, ?, ?, ?, ?, ?)');
    feeStmt.run('VCM/25/0142', 'Terhemba Doose', 560000, 'Paid', '2026-08-20', 'Term fees paid in full');
    feeStmt.run('VCM/25/0088', 'Aondohemba David', 560000, 'Part', '2026-08-24', 'Balance due: 246000');
    feeStmt.run('VCM/25/0177', 'Eyioma Zion', 560000, 'Due', '2026-08-22', 'Follow-up required');
  }

  const attendanceCount = db.prepare('SELECT COUNT(*) AS c FROM attendance_records').get();
  if (!attendanceCount.c) {
    const attendanceStmt = db.prepare('INSERT INTO attendance_records (student_id, student_name, date, present, notes) VALUES (?, ?, ?, ?, ?)');
    attendanceStmt.run('VCM/25/0142', 'Terhemba Doose', '2026-09-02', 1, 'Present');
    attendanceStmt.run('VCM/25/0088', 'Aondohemba David', '2026-09-02', 1, 'Present');
    attendanceStmt.run('VCM/25/0177', 'Eyioma Zion', '2026-09-02', 0, 'Absent with excuse');
  }

  const vpExists = db.prepare('SELECT COUNT(*) AS c FROM vp_data').get();
  if (!vpExists.c) {
    db.prepare(`INSERT INTO vp_data (key, value) VALUES ('vp', ?)`).run(JSON.stringify({
      expenses: [
        { student: 'Ada Abah', id: 'VCM/26/0000', item: 'Lab coat replacement', cost: 4500, when: '28 Aug 2026' }
      ],
      staff: [
        { name: 'Mr. T.O. Vaatia', post: 'Principal', bank: 'Access Bank', acct: '0046856732', salary: 850000 },
        { name: 'Mr. M.C. Itodo', post: 'Vice Principal Administration', bank: 'UBA', acct: '1029384756', salary: 620000 }
      ],
      events: [
        { title: 'SS 3 Graduation & Prize Day', date: '2026-07-18', time: '10:00', place: 'College hall', status: 'Planning' }
      ]
    }));
  }
}

initialise();

function validateUser(email, password) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
}

function getUserByEmail(email) {
  return db.prepare('SELECT id, email, role, display_name FROM users WHERE email = ?').get(email);
}

function getStudents() {
  return db.prepare('SELECT * FROM students ORDER BY name').all();
}

function getStudentById(id) {
  return db.prepare('SELECT * FROM students WHERE id = ?').get(id);
}

function saveStudent(student) {
  const sql = `
    INSERT INTO students (id, name, class_name, house, state, fee_status, attendance, status, jamb_score, notes)
    VALUES (@id, @name, @class_name, @house, @state, @fee_status, @attendance, @status, @jamb_score, @notes)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      class_name = excluded.class_name,
      house = excluded.house,
      state = excluded.state,
      fee_status = excluded.fee_status,
      attendance = excluded.attendance,
      status = excluded.status,
      jamb_score = excluded.jamb_score,
      notes = excluded.notes
  `;
  db.prepare(sql).run(student);
  return getStudentById(student.id);
}

function listClasses() {
  return db.prepare('SELECT * FROM classes ORDER BY name').all();
}

function listHouses() {
  return db.prepare('SELECT * FROM houses ORDER BY name').all();
}

function listStaff() {
  return db.prepare('SELECT * FROM staff ORDER BY name').all();
}

function listFeeRecords() {
  return db.prepare('SELECT * FROM fee_records ORDER BY due_date DESC').all();
}

function listAttendance() {
  return db.prepare('SELECT * FROM attendance_records ORDER BY date DESC').all();
}

function listVpRecords() {
  return db.prepare('SELECT * FROM vp_records ORDER BY date DESC').all();
}

function createFeeRecord(record) {
  const result = db.prepare(`
    INSERT INTO fee_records (student_id, student_name, amount, status, due_date, notes)
    VALUES (@student_id, @student_name, @amount, @status, @due_date, @notes)
  `).run(record);
  return db.prepare('SELECT * FROM fee_records WHERE id = ?').get(result.lastInsertRowid);
}

function createAttendanceRecord(record) {
  const result = db.prepare(`
    INSERT INTO attendance_records (student_id, student_name, date, present, notes)
    VALUES (@student_id, @student_name, @date, @present, @notes)
  `).run(record);
  return db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(result.lastInsertRowid);
}

function createStaffMember(member) {
  const result = db.prepare(`
    INSERT INTO staff (name, role, department, phone, salary)
    VALUES (@name, @role, @department, @phone, @salary)
  `).run(member);
  return db.prepare('SELECT * FROM staff WHERE id = ?').get(result.lastInsertRowid);
}

function createClassItem(classItem) {
  const result = db.prepare(`
    INSERT INTO classes (name, level, teacher)
    VALUES (@name, @level, @teacher)
  `).run(classItem);
  return db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
}

function createHouseEntry(house) {
  const result = db.prepare(`
    INSERT INTO houses (name, capacity, occupancy)
    VALUES (@name, @capacity, @occupancy)
  `).run(house);
  return db.prepare('SELECT * FROM houses WHERE id = ?').get(result.lastInsertRowid);
}

function createVpRecord(record) {
  const result = db.prepare(`
    INSERT INTO vp_records (title, category, date, details)
    VALUES (@title, @category, @date, @details)
  `).run(record);
  return db.prepare('SELECT * FROM vp_records WHERE id = ?').get(result.lastInsertRowid);
}

function getVPData() {
  const row = db.prepare('SELECT value FROM vp_data WHERE key = ?').get('vp');
  return row ? JSON.parse(row.value) : { expenses: [], staff: [], events: [] };
}

function saveVPData(payload) {
  db.prepare('INSERT INTO vp_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('vp', JSON.stringify(payload));
  return getVPData();
}

module.exports = {
  db,
  validateUser,
  getUserByEmail,
  getStudents,
  getStudentById,
  saveStudent,
  listClasses,
  listHouses,
  listStaff,
  listFeeRecords,
  listAttendance,
  listVpRecords,
  createFeeRecord,
  createAttendanceRecord,
  createStaffMember,
  createClassItem,
  createHouseEntry,
  createVpRecord,
  getVPData,
  saveVPData,
};
