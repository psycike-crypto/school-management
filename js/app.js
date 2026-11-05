const ROLE_ACCESS = { principal: 'all', admin: 'admin', vp_admin: 'vpadmin', academics: 'acad', dean: 'dean', bursar: 'fee', hostel: 'host', teacher: 'teach', parent: 'parent' };
const ROLE_LABELS = { principal: 'Principal', admin: 'Administrator', vp_admin: 'Vice Principal Administration', academics: 'Vice Principal Academics', dean: 'Dean of Studies', bursar: 'Bursar', hostel: 'Hostel Master', teacher: 'Teacher', parent: 'Parent' };
const NAV = {
  all: [['dashboard','Command Centre'],['students','Students'],['fees','Fees'],['attendance','Attendance'],['staff','Staff'],['classes','Classes'],['houses','Boarding Houses'],['vp','VP Administration']],
  admin: [['dashboard','Command Centre'],['students','Students'],['fees','Fees'],['attendance','Attendance'],['staff','Staff'],['classes','Classes'],['houses','Boarding Houses'],['vp','VP Administration']],
  vpadmin: [['dashboard','Command Centre'],['students','Students'],['staff','Staff'],['houses','Boarding Houses'],['vp','VP Administration']],
  acad: [['dashboard','Command Centre'],['students','Students'],['attendance','Attendance'],['classes','Classes']],
  dean: [['dashboard','Command Centre'],['students','Students'],['attendance','Attendance'],['classes','Classes']],
  fee: [['dashboard','Command Centre'],['fees','Fee Ledger']],
  host: [['dashboard','Command Centre'],['students','Students'],['houses','Boarding Houses']],
  teach: [['dashboard','Command Centre'],['students','My Students'],['attendance','Attendance']],
  parent: [['dashboard','Command Centre']]
};
const HOME = { all:'dashboard', admin:'dashboard', vpadmin:'vp', acad:'dashboard', dean:'dashboard', fee:'fees', host:'dashboard', teach:'attendance', parent:'dashboard' };
const TITLES = { dashboard:'Command Centre', students:'Student Registry', fees:'Fee Ledger', attendance:'Attendance', staff:'Staff Directory', classes:'Classes', houses:'Boarding Houses', vp:'VP Administration' };
const state = { user:null, view:'dashboard', students:[], fees:[], attendance:[], staff:[], classes:[], houses:[], vp:{ expenses:[], staff:[], events:[] } };
const canManage = (type) => {
  const role = state.user?.role;
  if (type === 'students') return ['principal','admin'].includes(role);
  if (type === 'fees') return ['principal','admin','bursar'].includes(role);
  if (type === 'attendance') return ['principal','admin','teacher','academics'].includes(role);
  if (type === 'staff' || type === 'classes') return ['principal','admin'].includes(role);
  if (type === 'houses') return ['principal','admin','hostel'].includes(role);
  if (type === 'vp') return ['principal','admin','vp_admin'].includes(role);
  return false;
};

async function api(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (['POST','PUT','PATCH','DELETE'].includes(method)) headers['X-Requested-With'] = 'XMLHttpRequest';
  const response = await fetch(url, { ...options, method, headers, credentials:'same-origin' });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(payload.error || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return payload;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(message) { const el=document.getElementById('toast'); el.textContent=message; el.style.display='block'; clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.style.display='none',3200); }
function fmtMoney(value) { return new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(value)||0); }
function roleAccess(role) { return ROLE_ACCESS[role] || null; }
function activate(user) {
  const access=roleAccess(user.role); if(!access) throw new Error('Unsupported account role. Contact an administrator.');
  state.user={...user,access};
  document.getElementById('loginScreen').style.display='none'; document.getElementById('app').classList.add('open');
  document.getElementById('whoName').textContent=user.display_name||user.email; document.getElementById('whoRole').textContent=ROLE_LABELS[user.role]||user.role;
  buildNav();
}
function buildNav() { const items=NAV[state.user?.access]||[]; document.getElementById('nav').innerHTML=items.map(([id,label])=>`<button data-id="${id}" onclick="show('${id}')">${label}</button>`).join(''); }
async function login() {
  const button=document.querySelector('#loginForm button'); button.disabled=true;
  try { const result=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:document.getElementById('email').value.trim().toLowerCase(),password:document.getElementById('pass').value})}); activate(result.user); document.getElementById('pass').value=''; await init(); }
  catch(error){toast(error.message||'Sign-in failed.');} finally {button.disabled=false;}
}
async function logout() { try{await api('/api/auth/logout',{method:'POST'});}catch(e){console.error(e);} Object.keys(state).forEach(k=>{if(Array.isArray(state[k]))state[k]=[];}); state.user=null; state.vp={expenses:[],staff:[],events:[]}; document.getElementById('app').classList.remove('open'); document.getElementById('loginScreen').style.display='grid'; document.getElementById('pass').value=''; }
async function init() {
  if(!state.user)return;
  const role=state.user.role;
  const loaders=[];
  if(role!=='parent') loaders.push(loadInto('students','/api/students'));
  if(['principal','admin','bursar','teacher'].includes(role))loaders.push(loadInto('fees','/api/fees'));
  if(['principal','admin','academics','dean','teacher'].includes(role))loaders.push(loadInto('attendance','/api/attendance'));
  if(['principal','admin','vp_admin','academics','dean','teacher'].includes(role))loaders.push(loadInto('staff','/api/staff'));
  if(['principal','admin','vp_admin','academics','dean','teacher'].includes(role))loaders.push(loadInto('classes','/api/classes'));
  if(['principal','admin','vp_admin','bursar','hostel'].includes(role))loaders.push(loadInto('houses','/api/houses'));
  if(['principal','admin','vp_admin'].includes(role))loaders.push(api('/api/vp').then(x=>state.vp=x));
  await Promise.all(loaders); show(HOME[state.user.access]||'dashboard');
}
async function loadInto(key,url) { try{state[key]=await api(url);}catch(error){if(error.status===401){state.user=null;document.getElementById('app').classList.remove('open');document.getElementById('loginScreen').style.display='grid';}else console.error(error);} }
function show(view) { if(!state.user)return; const allowed=(NAV[state.user.access]||[]).map(x=>x[0]); if(!allowed.includes(view))view=HOME[state.user.access]||'dashboard'; state.view=view; document.getElementById('pageTitle').textContent=TITLES[view]||'Command Centre'; document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.id===view)); const render={dashboard:renderDashboard,students:renderStudents,fees:renderFees,attendance:renderAttendance,staff:renderStaff,classes:renderClasses,houses:renderHouses,vp:renderVP}; document.getElementById('view').innerHTML=render[view](); }
function actionButton(type,label) { return canManage(type)?`<button class="btn btn-navy btn-sm" onclick="openForm('${type}')">${label}</button>`:''; }
function renderDashboard() {
  const paid=state.students.filter(x=>x.fee_status==='Paid').length, due=state.students.filter(x=>x.fee_status==='Due').length;
  const avg=state.students.length?Math.round(state.students.reduce((n,x)=>n+Number(x.attendance||0),0)/state.students.length):0;
  return `<div class="notice"><strong>School operations.</strong> Signed in as ${escapeHtml(ROLE_LABELS[state.user.role])}. Use the desks available to your role.</div><div class="kpis"><div class="kpi"><span>Students on roll</span><b>${state.students.length}</b><em>Tracked students</em></div><div class="kpi"><span>Fees marked paid</span><b>${paid}</b><em>${due} due</em></div><div class="kpi"><span>Attendance average</span><b>${avg}%</b><em>Current student records</em></div><div class="kpi"><span>Classes</span><b>${state.classes.length}</b><em>Registered classes</em></div></div><div class="card"><h3>Quick links</h3><div class="toolbar">${(NAV[state.user.access]||[]).filter(([id])=>id!=='dashboard').map(([id,label])=>`<button class="btn btn-ghost btn-sm" onclick="show('${id}')">${label}</button>`).join('')}</div></div>`;
}
function renderStudents(query='') {
  const canEdit=canManage('students'), q=String(query).toLowerCase(); const rows=state.students.filter(s=>`${s.id} ${s.name} ${s.class_name||''}`.toLowerCase().includes(q));
  return `<div class="toolbar"><input id="studentSearch" placeholder="Search name, ID, or class" value="${escapeHtml(query)}" oninput="filterStudents(this.value)">${actionButton('students','Add student')}</div><div class="card"><table><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>House</th><th>State</th><th>Fees</th><th>Attendance</th><th>Status</th>${canEdit?'<th></th>':''}</tr></thead><tbody>${rows.map(s=>`<tr><td>${escapeHtml(s.id)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.class_name||'-')}</td><td>${escapeHtml(s.house||'-')}</td><td>${escapeHtml(s.state||'-')}</td><td>${escapeHtml(s.fee_status||'Due')}</td><td>${Number(s.attendance)||0}%</td><td>${escapeHtml(s.status||'-')}</td>${canEdit?`<td><button class="btn btn-ghost btn-sm" onclick="openForm('students','${encodeURIComponent(s.id)}')">Edit</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${canEdit?9:8}">No students found.</td></tr>`}</tbody></table></div>`;
}
function filterStudents(q){document.getElementById('view').innerHTML=renderStudents(q);}
function renderFees() { return `<div class="toolbar"><h3>Fee records</h3>${actionButton('fees','Record fee')}</div><div class="card"><table><thead><tr><th>Student ID</th><th>Student</th><th>Amount</th><th>Status</th><th>Due</th><th>Notes</th></tr></thead><tbody>${state.fees.map(f=>`<tr><td>${escapeHtml(f.student_id)}</td><td>${escapeHtml(f.student_name)}</td><td>${fmtMoney(f.amount)}</td><td>${escapeHtml(f.status)}</td><td>${escapeHtml(f.due_date||'-')}</td><td>${escapeHtml(f.notes||'-')}</td></tr>`).join('')||'<tr><td colspan="6">No fee records found.</td></tr>'}</tbody></table></div>`; }
function renderAttendance() { return `<div class="toolbar"><h3>Attendance records</h3>${actionButton('attendance','Mark attendance')}</div><div class="card"><table><thead><tr><th>Date</th><th>Student ID</th><th>Student</th><th>Present</th><th>Notes</th></tr></thead><tbody>${state.attendance.map(a=>`<tr><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.student_id)}</td><td>${escapeHtml(a.student_name)}</td><td>${Number(a.present)?'Present':'Absent'}</td><td>${escapeHtml(a.notes||'-')}</td></tr>`).join('')||'<tr><td colspan="5">No attendance records found.</td></tr>'}</tbody></table></div>`; }
function renderStaff() { return `<div class="toolbar"><h3>Staff directory</h3>${actionButton('staff','Add staff')}</div><div class="card"><table><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Phone</th><th>Salary</th></tr></thead><tbody>${state.staff.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.role||'-')}</td><td>${escapeHtml(s.department||'-')}</td><td>${escapeHtml(s.phone||'-')}</td><td>${fmtMoney(s.salary)}</td></tr>`).join('')||'<tr><td colspan="5">No staff records found.</td></tr>'}</tbody></table></div>`; }
function renderClasses() { return `<div class="toolbar"><h3>Classes</h3>${actionButton('classes','Add class')}</div><div class="card"><table><thead><tr><th>Class</th><th>Level</th><th>Teacher</th></tr></thead><tbody>${state.classes.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.level||'-')}</td><td>${escapeHtml(c.teacher||'-')}</td></tr>`).join('')||'<tr><td colspan="3">No classes found.</td></tr>'}</tbody></table></div>`; }
function renderHouses() { return `<div class="toolbar"><h3>Boarding houses</h3>${actionButton('houses','Add house')}</div><div class="card"><table><thead><tr><th>House</th><th>Capacity</th><th>Occupancy</th><th>Available</th></tr></thead><tbody>${state.houses.map(h=>`<tr><td>${escapeHtml(h.name)}</td><td>${Number(h.capacity)||0}</td><td>${Number(h.occupancy)||0}</td><td>${Math.max(0,Number(h.capacity||0)-Number(h.occupancy||0))}</td></tr>`).join('')||'<tr><td colspan="4">No houses found.</td></tr>'}</tbody></table></div>`; }
function renderVP() { return `<div class="card"><h3>VP Administration · Events</h3><table><thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Status</th></tr></thead><tbody>${(state.vp.events||[]).map(e=>`<tr><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.place||e.location||'-')}</td><td>${escapeHtml(e.status||'Scheduled')}</td></tr>`).join('')||'<tr><td colspan="4">No events recorded.</td></tr>'}</tbody></table></div>`; }
function modalForm(title,fields,submitLabel='Save') { document.getElementById('sheet').innerHTML=`<h3>${title}</h3><form id="dataForm">${fields}<div class="toolbar" style="margin-top:16px"><button class="btn btn-navy" type="submit">${submitLabel}</button><button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button></div></form>`; document.getElementById('modal').classList.add('show'); }
function input(label,name,{type='text',value='',required=false,options=null,step=null,min=null}={}) { const attr=`${required?'required':''}${step!==null?` step="${step}"`:''}${min!==null?` min="${min}"`:''}`; const control=options?`<select name="${name}" ${required?'required':''}>${options.map(x=>`<option value="${escapeHtml(x[0])}">${escapeHtml(x[1])}</option>`).join('')}</select>`:`<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${attr}>`; return `<label>${label}</label>${control}`; }
function openForm(type,encodedId='') {
  if(!canManage(type))return toast('Your role cannot create or edit this record.');
  const id=encodedId?decodeURIComponent(encodedId):''; const student=state.students.find(s=>s.id===id)||{}; let fields='', endpoint='',method='POST', title='';
  if(type==='students') { const edit=Boolean(id); title=edit?'Edit student':'Add student'; endpoint=edit?`/api/students/${encodeURIComponent(id)}`:'/api/students'; method=edit?'PUT':'POST'; fields=`<div class="row"><div>${input('Student ID','id',{value:student.id||'',required:true})}</div><div>${input('Full name','name',{value:student.name||'',required:true})}</div></div><div class="row"><div>${input('Class','class_name',{value:student.class_name||''})}</div><div>${input('House','house',{value:student.house||''})}</div></div><div class="row"><div>${input('State','state',{value:student.state||''})}</div><div>${input('Fee status','fee_status',{options:[['Due','Due'],['Part','Part'],['Paid','Paid']]})}</div></div><div class="row"><div>${input('Attendance (%)','attendance',{type:'number',value:student.attendance??0,min:0,step:1})}</div><div>${input('Status','status',{value:student.status||'Boarding'})}</div></div>${input('Notes','notes',{value:student.notes||''})}`; }
  if(type==='fees') { title='Record a fee'; endpoint='/api/fees'; const choices=state.students.map(s=>[s.id,`${s.name} (${s.id})`]); fields=`${input('Student','student_id',{options:choices,required:true})}${input('Amount (NGN)','amount',{type:'number',required:true,min:0,step:'0.01'})}${input('Status','status',{options:[['Due','Due'],['Part','Part'],['Paid','Paid']]})}${input('Due date','due_date',{type:'date'})}${input('Notes','notes')}`; }
  if(type==='attendance') { title='Mark attendance'; endpoint='/api/attendance'; const choices=state.students.map(s=>[s.id,`${s.name} (${s.id})`]); fields=`${input('Student','student_id',{options:choices,required:true})}${input('Date','date',{type:'date',required:true,value:new Date().toISOString().slice(0,10)})}${input('Attendance','present',{options:[[1,'Present'],[0,'Absent']]})}${input('Notes','notes')}`; }
  if(type==='staff') { title='Add staff member'; endpoint='/api/staff'; fields=`${input('Full name','name',{required:true})}${input('Role','role')}${input('Department','department')}${input('Phone','phone')}${input('Salary (NGN)','salary',{type:'number',min:0,step:'0.01'})}`; }
  if(type==='classes') { title='Add class'; endpoint='/api/classes'; fields=`${input('Class name','name',{required:true})}${input('Level','level')}${input('Teacher','teacher')}`; }
  if(type==='houses') { title='Add boarding house'; endpoint='/api/houses'; fields=`${input('House name','name',{required:true})}${input('Capacity','capacity',{type:'number',min:0,step:1})}${input('Current occupancy','occupancy',{type:'number',min:0,step:1})}`; }
  modalForm(title,fields);
  const form=document.getElementById('dataForm');
  form.addEventListener('submit',async event=>{ event.preventDefault(); const data=Object.fromEntries(new FormData(form).entries());
    if(type==='fees'||type==='attendance'){const student=state.students.find(s=>s.id===data.student_id);if(!student)return toast('Select a valid student.');data.student_name=student.name;}
    for(const key of ['amount','salary','capacity','occupancy','attendance'])if(data[key]!==undefined&&data[key]!=='')data[key]=Number(data[key]);
    if(type==='attendance')data.present=Number(data.present);
    try{await api(endpoint,{method,body:JSON.stringify(data)});closeModal();await refresh(type);show(type);toast('Record saved successfully.');}catch(error){toast(error.message||'Could not save record.');}
  });
}
async function refresh(type){const endpoints={students:'/api/students',fees:'/api/fees',attendance:'/api/attendance',staff:'/api/staff',classes:'/api/classes',houses:'/api/houses'};if(endpoints[type])await loadInto(type,endpoints[type]);}
function closeModal(){document.getElementById('modal').classList.remove('show');}
function omniGo(){const value=document.getElementById('omni').value.trim();if(!value)return;show('students');filterStudents(value);}
window.addEventListener('DOMContentLoaded',async()=>{document.getElementById('loginForm').addEventListener('submit',event=>{event.preventDefault();login();});try{const result=await api('/api/auth/me');activate(result.user);await init();}catch(error){if(error.status!==401)console.error(error);}});
window.login=login;window.logout=logout;window.show=show;window.openForm=openForm;window.closeModal=closeModal;window.filterStudents=filterStudents;window.omniGo=omniGo;
