const USERS = {
  'principal@vaatiacollege.com.ng': { name: 'Mr. T.O. Vaatia', role: 'Principal', access: 'all' },
  'admin@vaatiacollege.com.ng': { name: 'College Admin', role: 'Admin', access: 'admin' },
  'vpadmin@vaatiacollege.com.ng': { name: 'Mr. M.C. Itodo', role: 'Vice Principal Administration', access: 'vpadmin' },
  'academics@vaatiacollege.com.ng': { name: 'Mr. S.T. Dzapine', role: 'Vice Principal Academics', access: 'acad' },
  'dean@vaatiacollege.com.ng': { name: 'Mr. O. Pius', role: 'Dean of Studies', access: 'dean' },
  'bursar@vaatiacollege.com.ng': { name: 'Bursary Office', role: 'Bursar', access: 'fee' },
  'hostel@vaatiacollege.com.ng': { name: 'House System', role: 'Hostel Master', access: 'host' },
  'teacher@vaatiacollege.com.ng': { name: 'Mr. T.T. Tyohuna', role: 'Mathematics Teacher', access: 'teach' },
  'parent@vaatiacollege.com.ng': { name: 'Mrs. M. Terhemba', role: 'Parent', access: 'parent' }
};

const DESK_NAV = {
  all: [['dashboard', 'Command Centre']],
  admin: [['dashboard', 'Command Centre'], ['students', 'Student Registry']],
  vpadmin: [['dashboard', 'Command Centre'], ['vp', 'VP Administration']],
  acad: [['dashboard', 'Command Centre'], ['students', 'Academics']],
  dean: [['dashboard', 'Command Centre'], ['students', 'Dean of Studies']],
  fee: [['dashboard', 'Command Centre'], ['fees', 'Bursary desk']],
  host: [['dashboard', 'Command Centre'], ['students', 'Boarding houses']],
  teach: [['dashboard', 'Command Centre'], ['teacher', 'My teaching desk']],
  parent: [['dashboard', 'Command Centre'], ['students', 'My ward']]
};

const HOME = {
  all: 'dashboard',
  admin: 'dashboard',
  vpadmin: 'vp',
  acad: 'dashboard',
  dean: 'dashboard',
  fee: 'fees',
  host: 'dashboard',
  teach: 'teacher',
  parent: 'students'
};

let current = null;
let students = [];
let vpData = { expenses: [], staff: [], events: [] };

function fill(email) {
  const input = document.getElementById('email');
  if (input) input.value = email;
}

function toggleTeachMenu() {
  const menu = document.getElementById('teachMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

function pickTeacher() {
  const sel = document.getElementById('teachPick');
  if (!sel) return;
  const pick = sel.value || 'teacher@vaatiacollege.com.ng';
  fill(pick);
  document.getElementById('pass').value = 'nexus2026';
  login();
}

function login() {
  const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
  const pass = document.getElementById('pass')?.value || '';
  if (pass !== 'nexus2026' || !USERS[email]) {
    alert('Use a demo role and password nexus2026');
    return;
  }

  current = { email, ...USERS[email] };
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('open');
  document.getElementById('whoName').textContent = current.name;
  document.getElementById('whoRole').textContent = current.role;
  buildNav();
  show(HOME[current.access] || 'dashboard');
}

function logout() {
  current = null;
  document.getElementById('app').classList.remove('open');
  document.getElementById('loginScreen').style.display = 'grid';
}

function buildNav() {
  const nav = document.getElementById('nav');
  const items = DESK_NAV[current?.access || 'all'];
  nav.innerHTML = items.map(([id, label]) => `
    <button data-id="${id}" onclick="show('${id}')">${label}</button>
  `).join('');
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === (HOME[current?.access || 'all'] || 'dashboard'));
  });
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => {
    t.style.display = 'none';
  }, 2600);
}

function show(id) {
  if (!current) return;
  const allowed = (DESK_NAV[current.access] || DESK_NAV.all).map(([key]) => key);
  if (id && !allowed.includes(id)) {
    id = HOME[current.access] || allowed[0];
  }
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });

  const titles = {
    dashboard: 'Command Centre',
    students: 'Student Registry',
    fees: 'Bursary Desk',
    teacher: 'Teaching Desk',
    vp: 'VP Administration'
  };
  document.getElementById('pageTitle').textContent = titles[id] || 'Command Centre';

  const handlers = {
    dashboard: renderDashboard,
    students: renderStudents,
    fees: renderFees,
    teacher: renderTeacher,
    vp: renderVP
  };

  document.getElementById('view').innerHTML = handlers[id] ? handlers[id]() : renderDashboard();
}

async function loadStudents() {
  try {
    const response = await fetch('/api/students');
    if (!response.ok) throw new Error('Failed to load students');
    students = await response.json();
  } catch (error) {
    console.error(error);
    students = [];
  }
}

async function loadVP() {
  try {
    const response = await fetch('/api/vp');
    if (!response.ok) throw new Error('Failed to load VP data');
    vpData = await response.json();
  } catch (error) {
    console.error(error);
    vpData = { expenses: [], staff: [], events: [] };
  }
}

async function init() {
  await loadStudents();
  await loadVP();
  if (current) show(HOME[current.access] || 'dashboard');
}

function renderDashboard() {
  const paid = students.filter((s) => s.fee_status === 'Paid').length;
  const due = students.filter((s) => s.fee_status === 'Due').length;
  const avgAttendance = students.length ? Math.round(students.reduce((sum, s) => sum + Number(s.attendance || 0), 0) / students.length) : 0;

  return `
    <div class="notice"><strong>Session pulse.</strong> First Term 2025/2026 is active. The school dashboard is connected to the SQLite database.</div>
    <div class="kpis">
      <div class="kpi"><span>On roll</span><b>${students.length}</b><em>Total tracked students</em></div>
      <div class="kpi"><span>Fee collection</span><b>${paid}</b><em>Paid records</em></div>
      <div class="kpi"><span>Attendance</span><b>${avgAttendance}%</b><em>Average class attendance</em></div>
      <div class="kpi"><span>Due</span><b>${due}</b><em>Needs follow-up</em></div>
    </div>
    <div class="card">
      <h3>Quick summary</h3>
      <table>
        <thead>
          <tr><th>Metric</th><th>Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Students captured</td><td>${students.length}</td></tr>
          <tr><td>Boarding houses</td><td>5 live houses</td></tr>
          <tr><td>Fee status</td><td>${paid} paid / ${due} due</td></tr>
          <tr><td>Database</td><td>SQLite</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderStudents() {
  return `
    <div class="toolbar">
      <input id="studentSearch" placeholder="Search student name" />
      <button class="btn btn-navy btn-sm" onclick="openStudentModal()">Add student</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Class</th><th>House</th><th>State</th><th>Fees</th><th>Attendance</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((student) => `
            <tr>
              <td>${student.id}</td>
              <td>${student.name}</td>
              <td>${student.class_name || '-'}</td>
              <td>${student.house || '-'}</td>
              <td>${student.state || '-'}</td>
              <td><span class="tag ${student.fee_status === 'Paid' ? 'ok' : student.fee_status === 'Due' ? 'due' : 'off'}">${student.fee_status || 'Due'}</span></td>
              <td>${student.attendance || 0}%</td>
              <td>${student.status || 'Boarding'}</td>
            </tr>
          `).join('') || '<tr><td colspan="8">No students found.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function renderFees() {
  return `
    <div class="card">
      <h3>Fee ledger</h3>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Fee status</th><th>Attendance</th></tr></thead>
        <tbody>
          ${students.map((student) => `
            <tr>
              <td>${student.name}</td>
              <td>${student.class_name || ''}</td>
              <td><span class="tag ${student.fee_status === 'Paid' ? 'ok' : student.fee_status === 'Due' ? 'due' : 'off'}">${student.fee_status || 'Due'}</span></td>
              <td>${student.attendance || 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTeacher() {
  return `
    <div class="card">
      <h3>Teacher desk</h3>
      <p>Teacher access is now connected to the database. Use the same demo login and the records will stay persisted in SQLite.</p>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Notes</th></tr></thead>
        <tbody>
          ${students.slice(0, 6).map((student) => `
            <tr>
              <td>${student.name}</td>
              <td>${student.class_name || '-'}</td>
              <td>${student.attendance || 0}%</td>
              <td>${student.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderVP() {
  return `
    <div class="card">
      <h3>VP Administration</h3>
      <table>
        <thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Status</th></tr></thead>
        <tbody>
          ${(vpData.events || []).map((event) => `
            <tr>
              <td>${event.title}</td>
              <td>${event.date}</td>
              <td>${event.place || event.location || '-'}</td>
              <td>${event.status || 'Scheduled'}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No events yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function openStudentModal() {
  const html = `
    <h3>Add / update student</h3>
    <form id="studentForm">
      <div class="row">
        <div>
          <label>Student ID</label>
          <input name="id" placeholder="VCM/25/0100" required />
        </div>
        <div>
          <label>Name</label>
          <input name="name" placeholder="Student full name" required />
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <div>
          <label>Class</label>
          <input name="class_name" placeholder="SSS 2 Science" />
        </div>
        <div>
          <label>House</label>
          <input name="house" placeholder="Akume House" />
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <div>
          <label>State</label>
          <input name="state" placeholder="Benue" />
        </div>
        <div>
          <label>Fee status</label>
          <select name="fee_status">
            <option value="Paid">Paid</option>
            <option value="Part">Part</option>
            <option value="Due">Due</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <div>
          <label>Attendance</label>
          <input name="attendance" type="number" min="0" max="100" value="95" />
        </div>
        <div>
          <label>Status</label>
          <input name="status" value="Boarding" />
        </div>
      </div>
      <div style="margin-top: 12px;">
        <label>Notes</label>
        <input name="notes" placeholder="Optional notes" />
      </div>
      <div class="toolbar" style="margin-top: 18px;">
        <button class="btn btn-navy" type="submit">Save</button>
        <button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
  document.getElementById('sheet').innerHTML = html;
  document.getElementById('modal').classList.add('show');

  document.getElementById('studentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = Object.fromEntries(form.entries());
    payload.attendance = Number(payload.attendance || 0);

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to save student');
      closeModal();
      await loadStudents();
      show('students');
      toast('Student saved to SQLite database.');
    } catch (error) {
      console.error(error);
      toast('Could not save student.');
    }
  });
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

window.addEventListener('DOMContentLoaded', () => {
  init();
  const teacherSelect = document.getElementById('teachPick');
  if (teacherSelect) {
    teacherSelect.innerHTML = [
      '<option value="teacher@vaatiacollege.com.ng">Mr. T.T. Tyohuna — Mathematics</option>',
      '<option value="teacher@vaatiacollege.com.ng">Mr. T.T. Tyohuna — Basic Technology</option>'
    ].join('');
  }
});

window.show = show;
window.login = login;
window.logout = logout;
window.fill = fill;
window.toggleTeachMenu = toggleTeachMenu;
window.pickTeacher = pickTeacher;
window.closeModal = closeModal;
window.openStudentModal = openStudentModal;
window.toast = toast;
