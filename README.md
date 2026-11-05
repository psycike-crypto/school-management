const ROLE_ACCESS = {
  principal: 'all',
  admin: 'admin',
  vp_admin: 'vpadmin',
  academics: 'acad',
  dean: 'dean',
  bursar: 'fee',
  hostel: 'host',
  teacher: 'teach',
  parent: 'parent'
};

const ROLE_LABELS = {
  principal: 'Principal',
  admin: 'Admin',
  vp_admin: 'Vice Principal Administration',
  academics: 'Vice Principal Academics',
  dean: 'Dean of Studies',
  bursar: 'Bursar',
  hostel: 'Hostel Master',
  teacher: 'Teacher',
  parent: 'Parent'
};

const DESK_NAV = {
  all: [['dashboard', 'Command Centre']],
  admin: [['dashboard', 'Command Centre'], ['students', 'Student Registry']],
  vpadmin: [['dashboard', 'Command Centre'], ['students', 'Student Registry'], ['vp', 'VP Administration']],
  acad: [['dashboard', 'Command Centre'], ['students', 'Academics']],
  dean: [['dashboard', 'Command Centre'], ['students', 'Dean of Studies']],
  fee: [['dashboard', 'Command Centre'], ['fees', 'Bursary desk']],
  host: [['dashboard', 'Command Centre'], ['students', 'Boarding houses']],
  teach: [['dashboard', 'Command Centre'], ['teacher', 'My teaching desk']],
  parent: [['dashboard', 'Command Centre']]
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
  parent: 'dashboard'
};

let current = null;
let students = [];
let vpData = { expenses: [], staff: [], events: [] };
let activeView = 'dashboard';

function api(pathname, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  return fetch(pathname, {
    ...options,
    method,
    headers,
    credentials: 'same-origin'
  }).then(async (response) => {
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); }
      catch { payload = { raw: text }; }
    }

    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `Request failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return response.status === 204 ? null : payload;
  });
}

function fill(email) {
  const input = document.getElementById('email');
  if (input) input.value = email;
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
  window.clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function showApp(user) {
  const role = String(user.role || '').toLowerCase();
  const access = ROLE_ACCESS[role];
  if (!access) {
    throw new Error('Your account has an unsupported role. Contact an administrator.');
  }

  current = {
    ...user,
    name: user.display_name || user.email,
    role,
    roleLabel: ROLE_LABELS[role] || role,
    access
  };

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('open');
  document.getElementById('whoName').textContent = current.name;
  document.getElementById('whoRole').textContent = current.roleLabel;
  buildNav();
}

async function login() {
  const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
  const password = document.getElementById('pass')?.value || '';
  const button = document.querySelector('#loginForm button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    showApp(result.user);
    await init();
  } catch (error) {
    toast(error.message || 'Unable to sign in.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error(error);
  }

  current = null;
  students = [];
  vpData = { expenses: [], staff: [], events: [] };
  document.getElementById('app').classList.remove('open');
  document.getElementById('loginScreen').style.display = 'grid';
  const pass = document.getElementById('pass');
  if (pass) pass.value = '';
}

function buildNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const items = DESK_NAV[current?.access || 'all'];
  nav.innerHTML = items.map(([id, label]) => `
    <button data-id="${id}" onclick="show('${id}')">${label}</button>
  `).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function show(id) {
  if (!current) return;
  const allowed = (DESK_NAV[current.access] || DESK_NAV.all).map(([key]) => key);
  if (!allowed.includes(id)) id = HOME[current.access] || allowed[0];
  activeView = id;

  document.querySelectorAll('#nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.id === id);
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
  if (!current) return;
  if (current.role === 'parent') {
    students = [];
    return;
  }
  try {
    students = await api('/api/students');
  } catch (error) {
    console.error(error);
    students = [];
  }
}

async function loadVP() {
  if (!current) return;
  if (!['principal', 'admin', 'vp_admin'].includes(current.role)) {
    vpData = { expenses: [], staff: [], events: [] };
    return;
  }
  try {
    vpData = await api('/api/vp');
  } catch (error) {
    console.error(error);
    vpData = { expenses: [], staff: [], events: [] };
  }
}

async function init() {
  if (!current) return;
  try {
    await Promise.all([loadStudents(), loadVP()]);
    show(HOME[current.access] || 'dashboard');
  } catch (error) {
    console.error(error);
    toast(error.message || 'Could not load school data.');
  }
}

function renderDashboard() {
  const paid = students.filter((s) => s.fee_status === 'Paid').length;
  const due = students.filter((s) => s.fee_status === 'Due').length;
  const average = students.length ? Math.round(students.reduce((sum, s) => sum + Number(s.attendance || 0), 0) / students.length) : 0;

  return `
    <div class="notice"><strong>Session pulse.</strong> First Term 2025/2026 is active. The school dashboard is connected to the secure backend.</div>
    <div class="kpis">
      <div class="kpi"><span>On roll</span><b>${students.length}</b><em>Total tracked students</em></div>
      <div class="kpi"><span>Fee collection</span><b>${paid}</b><em>Paid records</em></div>
      <div class="kpi"><span>Attendance</span><b>${average}%</b><em>Average class attendance</em></div>
      <div class="kpi"><span>Due</span><b>${due}</b><em>Needs follow-up</em></div>
    </div>
    <div class="card">
      <h3>Quick summary</h3>
      <table>
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
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
  const canEdit = ['principal', 'admin'].includes(current?.role);
  return `
    <div class="toolbar">
      <input id="studentSearch" placeholder="Search student name, ID, or class" oninput="filterStudents(this.value)" />
      ${canEdit ? '<button class="btn btn-navy btn-sm" onclick="openStudentModal()">Add student</button>' : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Class</th><th>House</th><th>State</th><th>Fees</th><th>Attendance</th><th>Status</th>${canEdit ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${students.map((student) => `
            <tr>
              <td>${escapeHtml(student.id)}</td>
              <td>${escapeHtml(student.name)}</td>
              <td>${escapeHtml(student.class_name || '-')}</td>
              <td>${escapeHtml(student.house || '-')}</td>
              <td>${escapeHtml(student.state || '-')}</td>
              <td><span class="tag ${student.fee_status === 'Paid' ? 'ok' : student.fee_status === 'Due' ? 'due' : 'off'}">${escapeHtml(student.fee_status || 'Due')}</span></td>
              <td>${Number(student.attendance || 0)}%</td>
              <td>${escapeHtml(student.status || 'Boarding')}</td>
              ${canEdit ? `<td><button class="btn btn-ghost btn-sm" onclick="openStudentModal('${encodeURIComponent(student.id)}')">Edit</button></td>` : ''}
            </tr>
          `).join('') || `<tr><td colspan="${canEdit ? 9 : 8}">No students found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function filterStudents(query) {
  const search = String(query || '').trim().toLowerCase();
  const filtered = students.filter((student) => `${student.id} ${student.name} ${student.class_name || ''}`.toLowerCase().includes(search));
  const rows = filtered.map((student) => `{...}`);
  const view = document.getElementById('view');
  if (!view) return;
  const canEdit = ['principal', 'admin'].includes(current?.role);
  view.innerHTML = `
    <div class="toolbar">
      <input id="studentSearch" placeholder="Search student name, ID, or class" value="${escapeHtml(query)}" oninput="filterStudents(this.value)" />
      ${canEdit ? '<button class="btn btn-navy btn-sm" onclick="openStudentModal()">Add student</button>' : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Class</th><th>House</th><th>State</th><th>Fees</th><th>Attendance</th><th>Status</th>${canEdit ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${filtered.map((student) => `
            <tr>
              <td>${escapeHtml(student.id)}</td>
              <td>${escapeHtml(student.name)}</td>
              <td>${escapeHtml(student.class_name || '-')}</td>
              <td>${escapeHtml(student.house || '-')}</td>
              <td>${escapeHtml(student.state || '-')}</td>
              <td><span class="tag ${student.fee_status === 'Paid' ? 'ok' : student.fee_status === 'Due' ? 'due' : 'off'}">${escapeHtml(student.fee_status || 'Due')}</span></td>
              <td>${Number(student.attendance || 0)}%</td>
              <td>${escapeHtml(student.status || 'Boarding')}</td>
              ${canEdit ? `<td><button class="btn btn-ghost btn-sm" onclick="openStudentModal('${encodeURIComponent(student.id)}')">Edit</button></td>` : ''}
            </tr>
          `).join('') || `<tr><td colspan="${canEdit ? 9 : 8}">No students found.</td></tr>`}
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
              <td>${escapeHtml(student.name)}</td>
              <td>${escapeHtml(student.class_name || '')}</td>
              <td><span class="tag ${student.fee_status === 'Paid' ? 'ok' : student.fee_status === 'Due' ? 'due' : 'off'}">${escapeHtml(student.fee_status || 'Due')}</span></td>
              <td>${Number(student.attendance || 0)}%</td>
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
      <p>Student records are available to your signed-in account.</p>
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Notes</th></tr></thead>
        <tbody>
          ${students.slice(0, 6).map((student) => `
            <tr>
              <td>${escapeHtml(student.name)}</td>
              <td>${escapeHtml(student.class_name || '-')}</td>
              <td>${Number(student.attendance || 0)}%</td>
              <td>${escapeHtml(student.notes || '-')}</td>
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
              <td>${escapeHtml(event.title)}</td>
              <td>${escapeHtml(event.date)}</td>
              <td>${escapeHtml(event.place || event.location || '-')}</td>
              <td>${escapeHtml(event.status || 'Scheduled')}</td>
            </tr>
          `).join('') || '<tr><td colspan="4">No events yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function openStudentModal(studentId = '') {
  if (!['principal', 'admin'].includes(current?.role)) {
    toast('You do not have permission to edit students.');
    return;
  }

  const id = studentId ? decodeURIComponent(studentId) : '';
  const student = students.find((item) => item.id === id) || {};
  const isEdit = Boolean(id);

  document.getElementById('sheet').innerHTML = `
    <h3>${isEdit ? 'Edit student' : 'Add student'}</h3>
    <form id="studentForm">
      <div class="row">
        <div>
          <label>Student ID</label>
          <input name="id" value="${escapeHtml(student.id || '')}" placeholder="VCM/25/0100" required ${isEdit ? 'readonly' : ''} />
        </div>
        <div>
          <label>Name</label>
          <input name="name" value="${escapeHtml(student.name || '')}" placeholder="Student full name" required />
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div>
          <label>Class</label>
          <input name="class_name" value="${escapeHtml(student.class_name || '')}" placeholder="SSS 2 Science" />
        </div>
        <div>
          <label>House</label>
          <input name="house" value="${escapeHtml(student.house || '')}" placeholder="Akume House" />
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div>
          <label>State</label>
          <input name="state" value="${escapeHtml(student.state || '')}" placeholder="Benue" />
        </div>
        <div>
          <label>Fee status</label>
          <select name="fee_status">
            <option value="Paid" ${student.fee_status === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Part" ${student.fee_status === 'Part' ? 'selected' : ''}>Part</option>
            <option value="Due" ${!student.fee_status || student.fee_status === 'Due' ? 'selected' : ''}>Due</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div>
          <label>Attendance</label>
          <input name="attendance" type="number" min="0" max="100" value="${Number(student.attendance ?? 95)}" required />
        </div>
        <div>
          <label>Status</label>
          <input name="status" value="${escapeHtml(student.status || 'Boarding')}" />
        </div>
      </div>
      <div style="margin-top:12px;">
        <label>Notes</label>
        <input name="notes" value="${escapeHtml(student.notes || '')}" placeholder="Optional notes" />
      </div>
      <div class="toolbar" style="margin-top:18px;">
        <button class="btn btn-navy" type="submit">Save</button>
        <button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;

  document.getElementById('modal').classList.add('show');
  document.getElementById('studentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    payload.attendance = Number(payload.attendance || 0);

    try {
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/students/${encodeURIComponent(id)}` : '/api/students';
      await api(url, {
        method,
        body: JSON.stringify(payload)
      });
      closeModal();
      await loadStudents();
      show('students');
      toast('Student record saved.');
    } catch (error) {
      toast(error.message || 'Could not save student.');
    }
  });
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('show');
}

function omniGo() {
  const value = document.getElementById('omni')?.value || '';
  if (!value) {
    show('dashboard');
    return;
  }
  filterStudents(value);
}

window.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      login();
    });
  }

  const pass = document.getElementById('pass');
  if (pass) {
    pass.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        login();
      }
    });
  }

  try {
    const result = await api('/api/auth/me');
    showApp(result.user);
    await init();
  } catch (error) {
    if (error.status !== 401) console.error(error);
  }
});

window.show = show;
window.login = login;
window.logout = logout;
window.fill = fill;
window.closeModal = closeModal;
window.openStudentModal = openStudentModal;
window.filterStudents = filterStudents;
window.toast = toast;
window.omniGo = omniGo;
window.api = api;
