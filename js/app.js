const ROLE_ACCESS = {
  principal: 'all', admin: 'admin', vp_admin: 'vpadmin', academics: 'acad',
  dean: 'dean', bursar: 'fee', hostel: 'host', teacher: 'teach', parent: 'parent'
};
const ROLE_LABELS = {
  principal: 'Principal', admin: 'Admin', vp_admin: 'Vice Principal Administration',
  academics: 'Vice Principal Academics', dean: 'Dean of Studies', bursar: 'Bursar',
  hostel: 'Hostel Master', teacher: 'Teacher', parent: 'Parent'
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
const HOME = { all: 'dashboard', admin: 'dashboard', vpadmin: 'vp', acad: 'dashboard', dean: 'dashboard', fee: 'fees', host: 'dashboard', teach: 'teacher', parent: 'dashboard' };
let current = null;
let students = [];
let vpData = { expenses: [], staff: [], events: [] };
let activeView = 'dashboard';

function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) headers['X-Requested-With'] = 'XMLHttpRequest';
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return fetch(path, { ...options, method, headers, credentials: 'same-origin' }).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  });
}

function fill(email) {
  const input = document.getElementById('email');
  if (input) input.value = email;
  document.getElementById('pass')?.focus();
}
function toggleTeachMenu() { document.getElementById('teachMenu')?.classList.toggle('show'); }
function pickTeacher() { return login(); }

function showApp(user) {
  const role = String(user.role || '').toLowerCase();
  const access = ROLE_ACCESS[role];
  if (!access) throw new Error('Your account has an unsupported role. Contact an administrator.');
  current = { ...user, email: user.email, name: user.display_name, roleLabel: ROLE_LABELS[role], role, access };
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').classList.add('open');
  document.getElementById('whoName').textContent = current.name;
  document.getElementById('whoRole').textContent = current.roleLabel;
  buildNav();
}

async function login() {
  const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
  const password = document.getElementById('pass')?.value || '';
  const button = document.querySelector('#loginScreen .btn-gold');
  if (button) button.disabled = true;
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    document.getElementById('pass').value = '';
    showApp(result.user);
    await init();
  } catch (error) {
    toast(error.message || 'Unable to sign in.');
  } finally {
    if (button) button.disabled = false;
  }
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch (error) { console.error(error); }
  current = null;
  students = [];
  vpData = { expenses: [], staff: [], events: [] };
  document.getElementById('app').classList.remove('open');
  document.getElementById('loginScreen').style.display = 'grid';
  document.getElementById('pass').value = '';
}

function buildNav() {
  const nav = document.getElementById('nav');
  const items = DESK_NAV[current?.access || 'all'];
  nav.innerHTML = items.map(([id, label]) => `<button data-id="${id}" onclick="show('${id}')">${label}</button>`).join('');
}

function toast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.style.display = 'none'; }, 3000);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function show(id) {
  if (!current) return;
  const allowed = DESK_NAV[current.access].map(([key]) => key);
  if (!allowed.includes(id)) id = HOME[current.access] || allowed[0];
  activeView = id;
  document.querySelectorAll('#nav button').forEach((button) => button.classList.toggle('active', button.dataset.id === id));
  const titles = { dashboard: 'Command Centre', students: 'Student Registry', fees: 'Bursary Desk', teacher: 'Teaching Desk', vp: 'VP Administration' };
  document.getElementById('pageTitle').textContent = titles[id] || 'Command Centre';
  const handlers = { dashboard: renderDashboard, students: renderStudents, fees: renderFees, teacher: renderTeacher, vp: renderVP };
  document.getElementById('view').innerHTML = handlers[id] ? handlers[id]() : renderDashboard();
}

async function loadStudents() {
  if (current?.role === 'parent') { students = []; return; }
  students = await api('/api/students');
}
async function loadVP() {
  if (!['principal', 'admin', 'vp_admin'].includes(current?.role)) { vpData = { expenses: [], staff: [], events: [] }; return; }
  vpData = await api('/api/vp');
}
async function init() {
  try {
    await Promise.all([loadStudents(), loadVP()]);
    if (current) show(activeView === 'dashboard' ? HOME[current.access] || 'dashboard' : activeView);
  } catch (error) {
    console.error(error);
    if (error.status === 401) { current = null; document.getElementById('app').classList.remove('open'); document.getElementById('loginScreen').style.display = 'grid'; }
    else toast(error.message || 'Could not load school data.');
  }
}

function renderDashboard() {
  const paid = students.filter((s) => s.fee_status === 'Paid').length;
  const due = students.filter((s) => s.fee_status === 'Due').length;
  const average = students.length ? Math.round(students.reduce((sum, s) => sum + Number(s.attendance || 0), 0) / students.length) : 0;
  return `<div class="notice"><strong>Session pulse.</strong> First Term 2025/2026 is active. You are signed in through the secure school portal.</div>
    <div class="kpis"><div class="kpi"><span>On roll</span><b>${students.length}</b><em>Total tracked students</em></div><div class="kpi"><span>Fee collection</span><b>${paid}</b><em>Paid records</em></div><div class="kpi"><span>Attendance</span><b>${average}%</b><em>Average class attendance</em></div><div class="kpi"><span>Due</span><b>${due}</b><em>Needs follow-up</em></div></div>
    <div class="card"><h3>Quick summary</h3><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody><tr><td>Students captured</td><td>${students.length}</td></tr><tr><td>Boarding houses</td><td>5 live houses</td></tr><tr><td>Fee status</td><td>${paid} paid / ${due} due</td></tr><tr><td>Database</td><td>SQLite</td></tr></tbody></table></div>`;
}

function renderStudents(query = '') {
  const canEdit = ['principal', 'admin'].includes(current?.role);
  const search = String(query).trim().toLowerCase();
  const rows = students.filter((s) => `${s.id} ${s.name} ${s.class_name || ''}`.toLowerCase().includes(search));
  return `<div class="toolbar"><input id="studentSearch" placeholder="Search student name, ID, or class" value="${escapeHtml(query)}" oninput="filterStudents(this.value)" />${canEdit ? '<button class="btn btn-navy btn-sm" onclick="openStudentModal()">Add student</button>' : ''}</div>
    <div class="card"><table><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>House</th><th>State</th><th>Fees</th><th>Attendance</th><th>Status</th>${canEdit ? '<th>Action</th>' : ''}</tr></thead><tbody>
    ${rows.map((s) => `<tr><td>${escapeHtml(s.id)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.class_name || '-')}</td><td>${escapeHtml(s.house || '-')}</td><td>${escapeHtml(s.state || '-')}</td><td><span class="tag ${s.fee_status === 'Paid' ? 'ok' : s.fee_status === 'Due' ? 'due' : 'off'}">${escapeHtml(s.fee_status || 'Due')}</span></td><td>${Number(s.attendance || 0)}%</td><td>${escapeHtml(s.status || 'Boarding')}</td>${canEdit ? `<td><button class="btn btn-ghost btn-sm" onclick="openStudentModal('${encodeURIComponent(s.id)}')">Edit</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${canEdit ? 9 : 8}">No students found.</td></tr>`}
    </tbody></table></div>`;
}
function filterStudents(query) { document.getElementById('view').innerHTML = renderStudents(query); }
function renderFees() {
  return `<div class="card"><h3>Fee ledger</h3><table><thead><tr><th>Student</th><th>Class</th><th>Fee status</th><th>Attendance</th></tr></thead><tbody>${students.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.class_name || '')}</td><td><span class="tag ${s.fee_status === 'Paid' ? 'ok' : s.fee_status === 'Due' ? 'due' : 'off'}">${escapeHtml(s.fee_status || 'Due')}</span></td><td>${Number(s.attendance || 0)}%</td></tr>`).join('')}</tbody></table></div>`;
}
function renderTeacher() {
  return `<div class="card"><h3>Teacher desk</h3><p>Student records available to your account.</p><table><thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Notes</th></tr></thead><tbody>${students.slice(0, 6).map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.class_name || '-')}</td><td>${Number(s.attendance || 0)}%</td><td>${escapeHtml(s.notes || '-')}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderVP() {
  return `<div class="card"><h3>VP Administration</h3><table><thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Status</th></tr></thead><tbody>${(vpData.events || []).map((e) => `<tr><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.place || e.location || '-')}</td><td>${escapeHtml(e.status || 'Scheduled')}</td></tr>`).join('') || '<tr><td colspan="4">No events yet.</td></tr>'}</tbody></table></div>`;
}

function openStudentModal(encodedId = '') {
  if (!['principal', 'admin'].includes(current?.role)) return toast('You do not have permission to edit students.');
  const id = encodedId ? decodeURIComponent(encodedId) : '';
  const student = students.find((item) => item.id === id) || {};
  const editing = Boolean(id);
  document.getElementById('sheet').innerHTML = `<h3>${editing ? 'Edit student' : 'Add student'}</h3><form id="studentForm">
    <div class="row"><div><label>Student ID</label><input name="id" value="${escapeHtml(student.id || '')}" placeholder="VCM/25/0100" required ${editing ? 'readonly' : ''} /></div><div><label>Name</label><input name="name" value="${escapeHtml(student.name || '')}" required maxlength="160" /></div></div>
    <div class="row" style="margin-top:12px"><div><label>Class</label><input name="class_name" value="${escapeHtml(student.class_name || '')}" /></div><div><label>House</label><input name="house" value="${escapeHtml(student.house || '')}" /></div></div>
    <div class="row" style="margin-top:12px"><div><label>State</label><input name="state" value="${escapeHtml(student.state || '')}" /></div><div><label>Fee status</label><select name="fee_status"><option ${student.fee_status === 'Paid' ? 'selected' : ''}>Paid</option><option ${student.fee_status === 'Part' ? 'selected' : ''}>Part</option><option ${!student.fee_status || student.fee_status === 'Due' ? 'selected' : ''}>Due</option></select></div></div>
    <div class="row" style="margin-top:12px"><div><label>Attendance</label><input name="attendance" type="number" min="0" max="100" value="${Number(student.attendance ?? 95)}" required /></div><div><label>Status</label><input name="status" value="${escapeHtml(student.status || 'Boarding')}" /></div></div>
    <div style="margin-top:12px"><label>Notes</label><input name="notes" value="${escapeHtml(student.notes || '')}" /></div><div class="toolbar" style="margin-top:18px"><button class="btn btn-navy" type="submit">Save</button><button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button></div></form>`;
  document.getElementById('modal').classList.add('show');
  document.getElementById('studentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    payload.id = payload.id.trim(); payload.name = payload.name.trim(); payload.attendance = Number(payload.attendance);
    try {
      await api(editing ? `/api/students/${encodeURIComponent(id)}` : '/api/students', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      closeModal(); await loadStudents(); show('students'); toast('Student record saved.');
    } catch (error) { toast(error.message || 'Could not save student.'); }
  });
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }

window.addEventListener('DOMContentLoaded', async () => {
  // Strip prototype-only demo controls and credentials from the served login screen.
  const login = document.getElementById('loginScreen');
  login.querySelector('.sub').textContent = 'Sign in with the account provided by your school administrator.';
  login.querySelectorAll('.roles, #teachMenu').forEach((element) => { element.hidden = true; });
  const email = document.getElementById('email');
  const password = document.getElementById('pass');
  email.value = ''; email.type = 'email'; email.autocomplete = 'username'; email.required = true;
  password.value = ''; password.autocomplete = 'current-password'; password.required = true;
  login.querySelector('.btn-gold').textContent = 'Sign in';
  password.addEventListener('keydown', (event) => { if (event.key === 'Enter') loginUser(); });
  email.addEventListener('keydown', (event) => { if (event.key === 'Enter') password.focus(); });
  try {
    const result = await api('/api/auth/me');
    showApp(result.user);
    await init();
  } catch (error) {
    if (error.status !== 401) console.error(error);
  }
});
function loginUser() { return login(); }
window.show = show;
window.login = login;
window.logout = logout;
window.fill = fill;
window.toggleTeachMenu = toggleTeachMenu;
window.pickTeacher = pickTeacher;
window.closeModal = closeModal;
window.openStudentModal = openStudentModal;
window.filterStudents = filterStudents;
window.toast = toast;
