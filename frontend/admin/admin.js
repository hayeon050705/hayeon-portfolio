/**
 * Admin dashboard — login, project list, create/edit form.
 * All requests go through /api/admin/* which require the admin_session
 * cookie set by /api/admin/login (HttpOnly — this script never sees or
 * stores the password or the session token itself).
 */

const REQUIRED_FIELDS = ['title', 'role', 'description', 'date', 'teamSize'];
const FIELD_LABELS = {
  title: '제목', role: '내가 한 역할', description: '설명', date: '날짜', teamSize: '참여인원수'
};

let currentStatus = 'draft';
let editingId = null;
let cachedEntries = [];

document.addEventListener('DOMContentLoaded', async () => {
  const authed = await checkSession();
  if (authed) showDashboard();
  else showLogin();

  document.getElementById('login-form').addEventListener('submit', onLogin);
  document.getElementById('logout-btn').addEventListener('click', onLogout);
  document.getElementById('new-project-btn').addEventListener('click', () => openEditor(null));
  document.getElementById('back-to-list-btn').addEventListener('click', showList);
  document.getElementById('project-form').addEventListener('submit', onSave);
  document.getElementById('status-draft-btn').addEventListener('click', () => setStatus('draft'));
  document.getElementById('status-published-btn').addEventListener('click', () => setStatus('published'));
});

/* ==========================================================================
   Auth
   ========================================================================== */
async function checkSession() {
  try {
    const res = await fetch('/api/admin/session');
    const data = await res.json();
    return !!data.authenticated;
  } catch {
    return false;
  }
}

async function onLogin(e) {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      errorEl.textContent = data.error || '로그인에 실패했습니다.';
      errorEl.hidden = false;
      return;
    }
    document.getElementById('login-password').value = '';
    showDashboard();
  } catch {
    errorEl.textContent = '네트워크 오류가 발생했습니다.';
    errorEl.hidden = false;
  }
}

async function onLogout() {
  await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
  showLogin();
}

function showLogin() {
  document.getElementById('login-view').hidden = false;
  document.getElementById('dashboard-view').hidden = true;
}

function showDashboard() {
  document.getElementById('login-view').hidden = true;
  document.getElementById('dashboard-view').hidden = false;
  showList();
}

/* ==========================================================================
   List
   ========================================================================== */
function showList() {
  document.getElementById('list-panel').hidden = false;
  document.getElementById('editor-panel').hidden = true;
  loadList();
}

async function loadList() {
  const listEl = document.getElementById('project-list');
  listEl.innerHTML = '<p class="admin-empty" id="list-loading">불러오는 중…</p>';

  try {
    const res = await fetch('/api/admin/projects');
    if (res.status === 401) { showLogin(); return; }
    cachedEntries = await res.json();
    renderList(cachedEntries);
  } catch {
    listEl.innerHTML = '<p class="admin-empty">목록을 불러오지 못했습니다.</p>';
  }
}

function renderList(entries) {
  const listEl = document.getElementById('project-list');

  if (!entries.length) {
    listEl.innerHTML = '<p class="admin-empty">아직 등록된 프로젝트가 없습니다. "새 프로젝트"로 추가해보세요.</p>';
    return;
  }

  listEl.innerHTML = entries.map(e => `
    <div class="admin-project-row" data-id="${escAttr(e.id)}">
      <div class="admin-project-row-main">
        <h3>${esc(e.title) || '(제목 없음)'}</h3>
        <div class="admin-project-row-meta">${esc(e.role) || '역할 미입력'} · ${esc(e.date) || '날짜 미입력'} · ${esc(e.teamSize) || '인원 미입력'}</div>
      </div>
      <span class="admin-status-badge ${e.status}">${e.status === 'published' ? '공개' : '초안'}</span>
    </div>
  `).join('');

  listEl.querySelectorAll('.admin-project-row').forEach(row => {
    row.addEventListener('click', () => openEditor(row.dataset.id));
  });
}

/** Update the in-memory list with a just-saved entry and re-render without
 * refetching — Vercel Blob writes can take a moment to be visible to a
 * fresh read, so refetching right after save can briefly show stale data. */
function upsertCachedEntry(entry) {
  const idx = cachedEntries.findIndex(e => e.id === entry.id);
  if (idx === -1) cachedEntries = [entry, ...cachedEntries];
  else cachedEntries = cachedEntries.map(e => (e.id === entry.id ? entry : e));
  renderList(cachedEntries);
}

/* ==========================================================================
   Editor
   ========================================================================== */
function setStatus(status) {
  currentStatus = status;
  document.getElementById('status-draft-btn').classList.toggle('active', status === 'draft');
  document.getElementById('status-published-btn').classList.toggle('active', status === 'published');
}

function fillForm(entry) {
  document.getElementById('f-title').value = entry?.title || '';
  document.getElementById('f-role').value = entry?.role || '';
  document.getElementById('f-description').value = entry?.description || '';
  document.getElementById('f-date').value = entry?.date || '';
  document.getElementById('f-teamSize').value = entry?.teamSize || '';
  document.getElementById('f-notes').value = entry?.notes || '';
  setStatus(entry?.status || 'draft');
}

async function openEditor(id) {
  document.getElementById('form-error').hidden = true;
  editingId = id;

  if (id) {
    document.getElementById('editor-kicker').textContent = 'Edit';
    document.getElementById('editor-title').textContent = '프로젝트 수정';
    // Prefer the entry we already have in memory (e.g. right after saving it)
    // over a fresh fetch, since a Blob write can take a moment to be visible
    // to a read that follows immediately after.
    const cached = cachedEntries.find(e => e.id === id);
    if (cached) {
      fillForm(cached);
    } else {
      try {
        const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`);
        if (res.status === 401) { showLogin(); return; }
        const entry = await res.json();
        fillForm(entry);
      } catch {
        showToast('프로젝트를 불러오지 못했습니다.');
        return;
      }
    }
  } else {
    document.getElementById('editor-kicker').textContent = 'New';
    document.getElementById('editor-title').textContent = '새 프로젝트';
    fillForm(null);
  }

  document.getElementById('list-panel').hidden = true;
  document.getElementById('editor-panel').hidden = false;
}

function readForm() {
  return {
    title: document.getElementById('f-title').value.trim(),
    role: document.getElementById('f-role').value.trim(),
    description: document.getElementById('f-description').value.trim(),
    date: document.getElementById('f-date').value.trim(),
    teamSize: document.getElementById('f-teamSize').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
    status: currentStatus
  };
}

function validateClientSide(data) {
  if (data.status !== 'published') return null;
  const missing = REQUIRED_FIELDS.filter(f => !data[f]);
  if (!missing.length) return null;
  return `공개하려면 모든 항목을 입력해야 합니다. (빠진 항목: ${missing.map(f => FIELD_LABELS[f]).join(', ')})`;
}

async function onSave(e) {
  e.preventDefault();
  const errorEl = document.getElementById('form-error');
  errorEl.hidden = true;

  const data = readForm();
  const clientError = validateClientSide(data);
  if (clientError) {
    errorEl.textContent = clientError;
    errorEl.hidden = false;
    return;
  }

  const saveBtn = document.getElementById('save-btn');
  const originalHTML = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 저장 중…';

  try {
    const url = editingId ? `/api/admin/projects/${encodeURIComponent(editingId)}` : '/api/admin/projects';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.status === 401) { showLogin(); return; }

    const result = await res.json();
    if (!res.ok) {
      errorEl.textContent = result.error || '저장에 실패했습니다.';
      errorEl.hidden = false;
      return;
    }

    showToast(data.status === 'published' ? '프로젝트가 공개되었습니다.' : '초안으로 저장되었습니다.');
    upsertCachedEntry(result);
    document.getElementById('list-panel').hidden = false;
    document.getElementById('editor-panel').hidden = true;
  } catch {
    errorEl.textContent = '네트워크 오류가 발생했습니다.';
    errorEl.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHTML;
  }
}

/* ==========================================================================
   Utils
   ========================================================================== */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function escAttr(str) {
  return esc(str).replace(/"/g, '&quot;');
}

function showToast(msg) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}
