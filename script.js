/* =============== Storage Keys =============== */
const STORAGE_KEY = 'entries_v2';
const STORAGE_TEAMS_KEY = 'teams_v1';

/* =============== Entries Data Layer =============== */
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function seedEntriesIfEmpty() {
  // No automatic seeding anymore. Just normalize existing if any.
  let entries = loadEntries();
  entries = entries.map(e => ({ name: e.name, phone: e.phone })).filter(e => e.name && e.phone);
  saveEntries(entries);
  return entries;
}

/* =============== Teams Data Layer =============== */
function loadTeams() {
  try { return JSON.parse(localStorage.getItem(STORAGE_TEAMS_KEY) || '[]'); } catch { return []; }
}
function saveTeams(teams) {
  localStorage.setItem(STORAGE_TEAMS_KEY, JSON.stringify(teams));
}
function randomColor() {
  // Pastel
  const r = Math.floor(150 + Math.random()*100);
  const g = Math.floor(150 + Math.random()*100);
  const b = Math.floor(150 + Math.random()*100);
  return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}
function slug() {
  return 't' + Math.random().toString(36).slice(2,7);
}
function seedTeamsIfEmpty() {
  let teams = loadTeams();
  if (teams.length === 0) {
    teams = [
      { id: crypto.randomUUID(), key: slug(), name: 'Реаниматологи', color: '#add8e6' },
      { id: crypto.randomUUID(), key: slug(), name: 'Анестезиологи', color: '#b19cd9' }
    ];
    saveTeams(teams);
  }
  return teams;
}

/* =============== Elements =============== */
const selectionListEl = document.getElementById('selection-list');
const resultEl = document.getElementById('result');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-result');
const teamButtonsContainer = document.getElementById('team-buttons');

const manageModal = document.getElementById('manage-modal');
const openManageBtn = document.getElementById('open-manage-btn');
const closeManageBtn = document.getElementById('close-manage-btn');

const peopleListEl = document.getElementById('people-list');
const addPersonBtn = document.getElementById('add-person-btn');
const personForm = document.getElementById('person-form');
const personIdInput = document.getElementById('person-id');
const personNameInput = document.getElementById('person-name');
const personPhoneInput = document.getElementById('person-phone');
const personOriginalPhoneInput = document.getElementById('person-original-phone');
const cancelEditBtn = document.getElementById('cancel-edit');

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

const addTeamBtn = document.getElementById('add-team-btn');
const teamForm = document.getElementById('team-form');
const teamIdInput = document.getElementById('team-id');
const teamNameInput = document.getElementById('team-name');
const teamColorInput = document.getElementById('team-color');
const cancelTeamEditBtn = document.getElementById('cancel-team-edit');
const teamListEl = document.getElementById('team-list');
const shiftControlsEl = document.getElementById('shift-controls');
let currentShift = 'day'; // 'day' or 'night'
let currentDateMode = 'today'; // 'today' or 'tomorrow'

let entries = seedEntriesIfEmpty();
let teams = seedTeamsIfEmpty();
let activeTeamId = null;

/* =============== Dynamic Team Styles =============== */
function rebuildTeamStyles() {
  let styleEl = document.getElementById('team-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'team-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  // Use higher specificity (.list li.team-KEY) and !important to override base list styling.
  styleEl.textContent = teams.map(t => {
    const color = t.color;
    // auto decide text color contrast
    let r,g,b;
    try {
      const hex = color.replace('#','');
      r = parseInt(hex.substring(0,2),16); g = parseInt(hex.substring(2,4),16); b = parseInt(hex.substring(4,6),16);
    } catch { r=g=b=255; }
    const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
    const fg = luminance > 0.65 ? '#111' : '#fff';
    return `.list li.team-${t.key}{background:${color} !important;color:${fg} !important;}
#team-buttons button[data-team-id="${t.id}"]{background:${color};border-color:${color};color:${fg};}
#team-buttons button[data-team-id="${t.id}"].active{box-shadow:0 0 0 2px ${color}AA,0 2px 8px -2px ${color};}`;
  }).join('\n');
}
rebuildTeamStyles();

/* =============== Rendering =============== */
function renderSelectionList() {
  selectionListEl.innerHTML = '';
  entries.forEach(e => {
    const li = document.createElement('li');
    li.dataset.phone = e.phone;
    li.dataset.value = e.phone;
    li.textContent = e.name;
    selectionListEl.appendChild(li);
  });
}
function renderManageList() {
  peopleListEl.innerHTML = '';
  entries.forEach(e => {
    const li = document.createElement('li');
    li.dataset.phone = e.phone;
    li.innerHTML = `
      <div class="meta">
        <strong class="name">${e.name}</strong>
        <span class="phone">${e.phone}</span>
      </div>
      <button class="small edit">✏️</button>
      <button class="small del">🗑</button>
    `;
    peopleListEl.appendChild(li);
  });
}
function renderTeamButtons() {
  teamButtonsContainer.innerHTML = '';
  teams.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.teamId = t.id;
    btn.innerHTML = `${t.name}`;
    if (t.id === activeTeamId) btn.classList.add('active');
    btn.addEventListener('click', () => {
      if (activeTeamId === t.id) {
        activeTeamId = null;
        btn.classList.remove('active');
      } else {
        activeTeamId = t.id;
        [...teamButtonsContainer.children].forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      }
    });
    teamButtonsContainer.appendChild(btn);
  });
}
function renderTeamManageList() {
  teamListEl.innerHTML = '';
  teams.forEach(t => {
    const li = document.createElement('li');
    li.dataset.id = t.id;
    li.innerHTML = `
      <div class="meta">
        <span class="team-badge" style="background:${t.color}"></span>
        <strong>${t.name}</strong>
      </div>
      <div>
        <button class="small team-edit">✏️</button>
        <button class="small team-del">🗑</button>
      </div>
    `;
    teamListEl.appendChild(li);
  });
}
function rerenderAll() {
  renderSelectionList();
  renderManageList();
  renderTeamButtons();
  renderTeamManageList();
  updateResult();
}
rerenderAll();

/* =============== Modal Control =============== */
openManageBtn.addEventListener('click', () => {
  manageModal.classList.remove('hidden');
  manageModal.setAttribute('aria-hidden','false');
});
closeManageBtn.addEventListener('click', closeManage);
manageModal.addEventListener('click', e => { if (e.target === manageModal) closeManage(); });
function closeManage() {
  manageModal.classList.add('hidden');
  manageModal.setAttribute('aria-hidden','true');
  personForm.classList.add('hidden');
  teamForm.classList.add('hidden');
  personForm.reset();
  teamForm.reset();
}

/* =============== Person CRUD =============== */
addPersonBtn.addEventListener('click', () => {
  personOriginalPhoneInput.value = '';
  personNameInput.value = '';
  personPhoneInput.value = '';
  personForm.classList.remove('hidden');
  personNameInput.focus();
});
cancelEditBtn.addEventListener('click', () => personForm.classList.add('hidden'));
personForm.addEventListener('submit', e => {
  e.preventDefault();
  const originalPhone = personOriginalPhoneInput.value.trim();
  const name = personNameInput.value.trim();
  const phone = personPhoneInput.value.trim();
  if (!name || !phone) return;

  if (originalPhone) {
    const idx = entries.findIndex(en => en.phone === originalPhone);
    if (idx !== -1) {
      // prevent duplicate phone if changed
      if (phone !== originalPhone && entries.some(en => en.phone === phone)) {
        alert('Такой номер уже существует.');
        return;
      }
      entries[idx].name = name;
      entries[idx].phone = phone;
    }
  } else {
    if (entries.some(en => en.phone === phone)) {
      alert('Такой номер уже существует.');
      return;
    }
    entries.push({ name, phone });
  }
  saveEntries(entries);
  personForm.classList.add('hidden');
  rerenderAll();
});
peopleListEl.addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const phoneKey = li.dataset.phone;
  if (e.target.classList.contains('edit')) {
    const entry = entries.find(en => en.phone === phoneKey);
    if (!entry) return;
    personOriginalPhoneInput.value = entry.phone;
    personNameInput.value = entry.name;
    personPhoneInput.value = entry.phone;
    personForm.classList.remove('hidden');
    personNameInput.focus();
  } else if (e.target.classList.contains('del')) {
    if (!confirm('Удалить запись?')) return;
    entries = entries.filter(en => en.phone !== phoneKey);
    saveEntries(entries);
    rerenderAll();
  }
});

/* =============== Team CRUD =============== */
addTeamBtn.addEventListener('click', () => {
  teamIdInput.value = '';
  teamNameInput.value = '';
  teamColorInput.value = randomColor();
  teamForm.classList.remove('hidden');
  teamNameInput.focus();
});
cancelTeamEditBtn.addEventListener('click', () => teamForm.classList.add('hidden'));
teamForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = teamIdInput.value.trim();
  const name = teamNameInput.value.trim();
  const color = teamColorInput.value;
  if (!name) return;
  if (id) {
    const t = teams.find(tt => tt.id === id);
    if (t) { t.name = name; t.color = color; }
  } else {
    teams.push({ id: crypto.randomUUID(), key: slug(), name, color });
  }
  saveTeams(teams);
  rebuildTeamStyles();
  teamForm.classList.add('hidden');
  renderTeamButtons();
  renderTeamManageList();
  updateResult();
});
teamListEl.addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const id = li.dataset.id;
  if (e.target.classList.contains('team-edit')) {
    const t = teams.find(tt => tt.id === id);
    if (!t) return;
    teamIdInput.value = t.id;
    teamNameInput.value = t.name;
    teamColorInput.value = t.color;
    teamForm.classList.remove('hidden');
    teamNameInput.focus();
  } else if (e.target.classList.contains('team-del')) {
    if (!confirm('Удалить команду?')) return;
    const team = teams.find(tt => tt.id === id);
    if (!team) return;
    // Remove class from assigned items
    const key = team.key;
    selectionListEl.querySelectorAll('.team-' + key).forEach(li2 => {
      li2.classList.remove('team-' + key, 'assigned');
    });
    if (activeTeamId === id) activeTeamId = null;
    teams = teams.filter(tt => tt.id !== id);
    saveTeams(teams);
    rebuildTeamStyles();
    renderTeamButtons();
    renderTeamManageList();
    updateResult();
  }
});

/* =============== Selection (assign to team) =============== */
selectionListEl.addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  if (!activeTeamId) {
    // clear all team classes from this li
    teams.forEach(t => li.classList.remove('team-'+t.key));
    li.classList.remove('assigned','highlight');
    updateResult();
    return;
  }
  const team = teams.find(t => t.id === activeTeamId);
  if (!team) return;
  // toggle membership: if already has this team class remove it else assign new (single membership)
  if (li.classList.contains('team-'+team.key)) {
    li.classList.remove('team-'+team.key,'assigned','highlight');
  } else {
    // remove other team classes
    teams.forEach(t => li.classList.remove('team-'+t.key));
    li.classList.add('team-'+team.key,'assigned','highlight');
  }
  updateResult();
});

/* =============== Result Output =============== */
function updateResult() {
  // Build header date line
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (currentDateMode === 'tomorrow') base.setDate(base.getDate()+1);
  const dd = String(base.getDate()).padStart(2,'0');
  const mm = String(base.getMonth()+1).padStart(2,'0');
  const yyyy = base.getFullYear();
  // Shift times
  const shiftStr = currentShift === 'day' ? '08:00 - 20:00' : '20:00 - 08:00';
  const header = `${dd}.${mm}.${yyyy}й соат ${shiftStr}:`;

  // Map custom headings: attempt to detect roles by team name keywords (case-insensitive)
  const sections = [];
  const lower = (s)=>s.toLowerCase();
  teams.forEach(t => {
    const items = [...selectionListEl.querySelectorAll('.team-'+t.key)]
      .map(li => `${li.textContent} ${li.dataset.value}`);
    if (!items.length) return;
    let title = t.name;
    const ln = lower(t.name);
    if (/реаним/.test(ln)) title = 'Навбатчи реаниматолог';
    else if (/анест|анэст/.test(ln)) title = 'Навбатчи анестизиолог';
    else if (/рем|зал/.test(ln)) title = 'Навбатчи рем зал';
    sections.push(`${title}:\n${items.join('\n')}`);
  });
  const out = [header, ...sections].join('\n');
  resultEl.textContent = out.trim();
  resultEl.style.whiteSpace = 'pre';
}

/* =============== Copy =============== */
copyBtn.addEventListener('click', () => {
  const textToCopy = resultEl.textContent;
  const ta = document.createElement('textarea');
  ta.value = textToCopy;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  copyBtn.textContent = 'Скопировано!';
  setTimeout(()=> copyBtn.textContent='Скопировать',1500);
});

/* =============== Clear =============== */
clearBtn.addEventListener('click', () => {
  selectionListEl.querySelectorAll('li').forEach(li => {
    teams.forEach(t => li.classList.remove('team-'+t.key));
    li.classList.remove('assigned','highlight');
  });
  activeTeamId = null;
  [...teamButtonsContainer.children].forEach(c => c.classList.remove('active'));
  resultEl.textContent = '';
});

/* =============== Import / Export People =============== */
exportBtn.addEventListener('click', () => {
  const payload = { entries, teams };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'duty_data.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const json = JSON.parse(evt.target.result);
      if (Array.isArray(json.entries)) {
        // normalize and deduplicate by phone
        const map = new Map();
        json.entries.forEach(en => {
          if (en && en.phone && en.name && !map.has(en.phone)) {
            map.set(en.phone, { name: en.name, phone: en.phone });
          }
        });
        entries = [...map.values()];
        saveEntries(entries);
      }
      if (Array.isArray(json.teams)) {
        teams = json.teams;
        saveTeams(teams);
        rebuildTeamStyles();
      }
      rerenderAll();
    } catch {}
  };
  reader.readAsText(file);
});

/* =============== Init =============== */
updateResult();

/* =============== Shift / Date Control Events =============== */
if (shiftControlsEl) {
  shiftControlsEl.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('shift-btn')) {
      currentShift = btn.dataset.shift;
      shiftControlsEl.querySelectorAll('.shift-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    } else if (btn.classList.contains('date-btn')) {
      currentDateMode = btn.dataset.date;
      shiftControlsEl.querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    }
    updateResult();
  });
}
