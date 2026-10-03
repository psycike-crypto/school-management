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

    CREATE TABLE IF NOT EXISTS vp_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS c FROM students').get();
  if (!count.c) {
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
  getStudents,
  getStudentById,
  saveStudent,
  getVPData,
  saveVPData,
};
