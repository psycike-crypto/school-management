const express = require('express');
const cors = require('cors');
const path = require('path');
const { getStudents, getStudentById, saveStudent, getVPData, saveVPData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(rootDir));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'School management API up.' });
});

app.get('/api/students', (req, res) => {
  res.json(getStudents());
});

app.get('/api/students/:id', (req, res) => {
  const student = getStudentById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

app.post('/api/students', (req, res) => {
  const student = req.body;
  if (!student || !student.id || !student.name) {
    return res.status(400).json({ error: 'Student id and name are required.' });
  }
  const saved = saveStudent({
    id: student.id,
    name: student.name,
    class_name: student.class_name || '',
    house: student.house || '',
    state: student.state || '',
    fee_status: student.fee_status || 'Due',
    attendance: Number(student.attendance || 0),
    status: student.status || 'Boarding',
    jamb_score: student.jamb_score || '—',
    notes: student.notes || ''
  });
  res.status(201).json(saved);
});

app.put('/api/students/:id', (req, res) => {
  const existing = getStudentById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Student not found' });

  const student = { ...existing, ...req.body, id: req.params.id };
  const saved = saveStudent(student);
  res.json(saved);
});

app.get('/api/vp', (req, res) => {
  res.json(getVPData());
});

app.post('/api/vp', (req, res) => {
  const payload = req.body || {};
  res.json(saveVPData(payload));
});

app.get('/*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`School management API running on http://localhost:${PORT}`);
});

module.exports = app;
