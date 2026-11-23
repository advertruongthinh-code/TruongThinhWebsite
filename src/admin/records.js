// Temporary CRUD page script for the CMS owner (cms-plan P1).

const TYPES = {
  news: 'Tin tức',
  project: 'Công trình',
  'advertising-card': 'Card quảng cáo',
  'hero-slide': 'Slide hero',
  'page-copy': 'Chữ trang chuẩn',
  'client-logo': 'Logo khách hàng',
  'home-projects': 'Công trình trang chủ',
  menu: 'Menu',
  contact: 'Liên hệ',
};
const SINGLE = new Set(['home-projects', 'menu', 'contact']);
const NO_CREATE = new Set([...SINGLE, 'page-copy']);
const STATUS_LABEL = { draft: 'Nháp', published: 'Đã đăng', trashed: 'Thùng rác' };
const ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

// Inside the Dockview editor ("Nội dung" panel) the page drops its own title and links.
if (new URLSearchParams(location.search).has('embed')) document.documentElement.classList.add('embed');
const $ = (id) => document.getElementById(id);
const els = {
  type: $('typeSelect'), filter: $('statusFilter'), status: $('status'), list: $('list'),
  more: $('moreBtn'), newBtn: $('newBtn'), meta: $('editorMeta'), json: $('json'),
  save: $('saveBtn'), trash: $('trashBtn'), restore: $('restoreBtn'), purge: $('purgeBtn'),
  download: $('downloadBtn'), reload: $('reloadBtn'), createRow: $('createRow'),
  createId: $('createId'), create: $('createBtn'), auditBox: $('auditBox'),
  auditBody: $('auditBody'), auditMore: $('auditMore'),
};

const state = {
  type: 'news', cursor: null, record: null, creatingId: null, conflict: null,
  busy: false, auditCursor: null, auditLoaded: false,
};

// ---- helpers ----

async function api(command, { method = 'GET', query, body } = {}) {
  let url = '/api/admin/' + command;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== null && v !== undefined && v !== '') qs.set(k, v);
    const s = qs.toString();
    if (s) url += '?' + s;
  }
  const init = { method };
  if (method === 'POST') {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { status: 0, ok: false, data: { error: 'network' } };
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = {}; }
  return { status: res.status, ok: res.ok, data: data || {} };
}

function fmtTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function setBusy(b) {
  state.busy = b;
  for (const btn of document.querySelectorAll('button')) btn.disabled = b;
  if (!b) refreshButtons();
}

function show(message, { error = false, lines = [], button = null } = {}) {
  els.status.textContent = message;
  els.status.className = error ? 'error' : '';
  if (lines.length) {
    const ul = document.createElement('ul');
    for (const l of lines) {
      const li = document.createElement('li');
      li.textContent = l;
      ul.appendChild(li);
    }
    els.status.appendChild(ul);
  }
  if (button) els.status.appendChild(button);
}

const msgs = (arr) => (Array.isArray(arr) ? arr : []).map((m) => (m && m.message) || JSON.stringify(m));

// Turn an error response into a status message.
function showError(res) {
  const d = res.data;
  if (d.error === 'shape') return show('Dữ liệu không đúng cấu trúc:', { error: true, lines: msgs(d.errors) });
  if (d.error === 'missing') return show('Còn thiếu để đăng:', { error: true, lines: msgs(d.missing) });
  if (d.error === 'too-large') return show('Dữ liệu quá lớn.', { error: true });
  if (d.error === 'slug') return show('Mã (slug) đã được dùng hoặc bị trùng.', { error: true });
  if (d.error === 'exists') return show('Mã này đã tồn tại.', { error: true });
  if (d.error === 'trashed') return show('Bản ghi đang ở thùng rác, hãy khôi phục trước.', { error: true });
  if (d.error === 'last-slide') return show('Không thể bỏ slide cuối cùng.', { error: true });
  if (d.error === 'home-projects-min') return show('Công trình trang chủ phải còn đủ số lượng tối thiểu.', { error: true });
  if (d.error === 'in-use') return show('Đang được sử dụng, không thể đưa vào thùng rác:', { error: true, lines: (d.usedBy || []).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))) });
  if (d.error === 'version' && d.current) {
    state.conflict = d.current;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Tải bản mới';
    btn.addEventListener('click', loadConflict);
    show('Bản này vừa được ' + (d.current.updatedBy || '?') + ' lưu lúc ' + fmtTime(d.current.updatedAt) + '. Hãy tải JSON của bạn trước khi tải bản mới.', { error: true, button: btn });
    refreshButtons();
    return;
  }
  return show('Lỗi ' + res.status + ': ' + (d.error || 'không rõ'), { error: true });
}

function refreshButtons() {
  const r = state.record;
  const single = SINGLE.has(state.type);
  const creating = !!state.creatingId;
  const trashed = r && r.status === 'trashed';
  els.newBtn.hidden = NO_CREATE.has(state.type);
  els.createRow.hidden = !creating;
  els.save.hidden = creating || !r;
  els.trash.hidden = creating || !r || trashed || single || state.type === 'page-copy';
  els.restore.hidden = creating || !trashed;
  els.purge.hidden = creating || !trashed;
  els.download.hidden = !state.conflict;
  els.reload.hidden = !state.conflict;
  els.more.hidden = !state.cursor;
  els.auditMore.hidden = !state.auditCursor;
}

// ---- list ----

function renderRow(item) {
  const li = document.createElement('li');
  li.dataset.id = item.id;
  if (state.record && state.record.id === item.id) li.className = 'active';
  const title = document.createElement('div');
  title.textContent = item.name || item.id;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = [
    item.id, STATUS_LABEL[item.status] || item.status, 'v' + item.version,
    fmtTime(item.updatedAt), item.updatedBy || '',
  ].filter(Boolean).join(' · ');
  li.append(title, meta);
  li.addEventListener('click', () => { if (!state.busy) openRecord(item.id); });
  return li;
}

async function loadList(append) {
  if (SINGLE.has(state.type)) {
    els.list.replaceChildren();
    state.cursor = null;
    return;
  }
  const res = await api('list', { query: { type: state.type, status: els.filter.value, cursor: append ? state.cursor : '' } });
  if (!res.ok) return showError(res);
  if (!append) els.list.replaceChildren();
  for (const item of res.data.items || []) els.list.appendChild(renderRow(item));
  state.cursor = res.data.next || null;
}

// ---- editor ----

function clearEditor() {
  state.record = null;
  state.creatingId = null;
  state.conflict = null;
  els.json.value = '';
  els.meta.textContent = 'Chưa mở bản ghi nào.';
}

function showRecord() {
  const r = state.record;
  els.meta.textContent = 'Mã: ' + r.id + ' | Trạng thái: ' + (STATUS_LABEL[r.status] || r.status) +
    ' | Phiên bản: ' + r.version + ' | Chờ đăng: ' + (r.pending ? 'có' : 'không');
  els.json.value = JSON.stringify(r.data, null, 2);
  for (const li of els.list.children) li.classList.toggle('active', li.dataset.id === r.id);
}

async function openRecord(id) {
  setBusy(true);
  try {
    const res = await api('get', { query: { type: state.type, id } });
    if (!res.ok) return showError(res);
    state.record = res.data;
    state.creatingId = null;
    state.conflict = null;
    showRecord();
    show('');
  } finally { setBusy(false); }
}

function parseJson() {
  try {
    return { value: JSON.parse(els.json.value) };
  } catch (e) {
    show('JSON không hợp lệ: ' + e.message, { error: true });
    return null;
  }
}

async function onSave() {
  const parsed = parseJson();
  if (!parsed || !state.record) return;
  setBusy(true);
  try {
    const r = state.record;
    const res = await api('save', { method: 'POST', body: { type: state.type, id: r.id, version: r.version, data: parsed.value } });
    if (!res.ok) return showError(res);
    r.version = res.data.version;
    r.status = res.data.status;
    r.pending = res.data.pending;
    r.data = parsed.value;
    state.conflict = null;
    showRecord();
    show('Đã lưu (phiên bản ' + r.version + ', trạng thái ' + (STATUS_LABEL[r.status] || r.status) + ')',
      { lines: [] });
    const missing = msgs(res.data.missing);
    if (missing.length) {
      const p = document.createElement('div');
      p.textContent = 'Còn thiếu để đăng:';
      const ul = document.createElement('ul');
      for (const m of missing) { const li = document.createElement('li'); li.textContent = m; ul.appendChild(li); }
      els.status.append(p, ul);
    }
    await loadList(false);
    showRecord();
  } finally { setBusy(false); }
}

function loadConflict() {
  const c = state.conflict;
  if (!c || !state.record) return;
  state.record.version = c.version;
  state.record.data = c.data;
  state.conflict = null;
  showRecord();
  show('Đã tải bản mới (phiên bản ' + c.version + ').');
  refreshButtons();
}

function downloadMine() {
  const blob = new Blob([els.json.value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.type + '-' + (state.record ? state.record.id : 'new') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function onTrash() {
  const r = state.record;
  if (!r || !confirm('Đưa "' + r.id + '" vào thùng rác?')) return;
  setBusy(true);
  try {
    const res = await api('trash', { method: 'POST', body: { type: state.type, id: r.id } });
    if (!res.ok) return showError(res);
    r.status = 'trashed';
    const refs = (res.data.referencedBy || []).map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    show('Đã đưa vào thùng rác.' + (refs.length ? ' Đang được tham chiếu bởi:' : ''), { lines: refs });
    showRecord();
    await loadList(false);
  } finally { setBusy(false); }
}

async function onRestore() {
  const r = state.record;
  if (!r) return;
  setBusy(true);
  try {
    const res = await api('restore', { method: 'POST', body: { type: state.type, id: r.id } });
    if (!res.ok) return showError(res);
    r.status = res.data.status || 'draft';
    show('Đã khôi phục (trạng thái ' + (STATUS_LABEL[r.status] || r.status) + ').');
    showRecord();
    await loadList(false);
  } finally { setBusy(false); }
}

async function onPurge() {
  const r = state.record;
  if (!r) return;
  const row = [...els.list.children].find((li) => li.dataset.id === r.id);
  const name = row ? row.firstChild.textContent : r.id;
  const confirmText = prompt('Nhập tên bản ghi để xóa hẳn: "' + name + '"');
  if (confirmText === null) return;
  setBusy(true);
  try {
    const res = await api('purge', { method: 'POST', body: { type: state.type, id: r.id, confirm: confirmText } });
    if (res.status === 403) return show('Chỉ chủ sở hữu mới được xóa hẳn.', { error: true });
    if (res.status === 400) return show('Tên xác nhận không đúng.', { error: true });
    if (!res.ok) return showError(res);
    clearEditor();
    show('Đã xóa hẳn.');
    await loadList(false);
  } finally { setBusy(false); }
}

// ---- create ----

function onNew() {
  const id = prompt('Nhập mã (chữ thường, số, dấu gạch ngang, tối đa 80 ký tự):');
  if (id === null) return;
  if (!ID_RE.test(id)) return show('Mã không hợp lệ. Chỉ dùng a-z, 0-9, dấu gạch ngang; bắt đầu bằng chữ hoặc số.', { error: true });
  let data = { id };
  if (state.record && state.record.data && typeof state.record.data === 'object') {
    data = { ...JSON.parse(JSON.stringify(state.record.data)), id };
    // Slugs are unique even for drafts: a copied slug would always be refused.
    delete data.slugVi;
    delete data.slugEn;
  }
  state.creatingId = id;
  state.conflict = null;
  els.createId.textContent = id;
  els.json.value = JSON.stringify(data, null, 2);
  els.meta.textContent = 'Bản ghi mới: ' + id;
  show('Chỉnh dữ liệu rồi bấm "Tạo".');
  refreshButtons();
}

async function onCreate() {
  const parsed = parseJson();
  if (!parsed) return;
  const id = state.creatingId;
  setBusy(true);
  try {
    const res = await api('create', { method: 'POST', body: { type: state.type, id, data: parsed.value } });
    if (!res.ok) return showError(res);
    state.creatingId = null;
    await loadList(false);
    show('Đã tạo "' + id + '".');
    setBusy(false);
    await openRecord(id);
  } finally { if (state.busy) setBusy(false); }
}

// ---- audit log ----

async function loadAudit(append) {
  const res = await api('audit-log', { query: { cursor: append ? state.auditCursor : '' } });
  if (!res.ok) return showError(res);
  if (!append) els.auditBody.replaceChildren();
  for (const it of res.data.items || []) {
    const tr = document.createElement('tr');
    for (const v of [it.seq, fmtTime(it.at), it.email, it.command, it.type, it.id, it.result]) {
      const td = document.createElement('td');
      td.textContent = v === undefined || v === null ? '' : String(v);
      tr.appendChild(td);
    }
    els.auditBody.appendChild(tr);
  }
  state.auditCursor = res.data.next || null;
}

// ---- wiring ----

async function guarded(fn) {
  setBusy(true);
  try { await fn(); } finally { setBusy(false); }
}

async function switchType() {
  state.type = els.type.value;
  clearEditor();
  await guarded(async () => {
    await loadList(false);
    show('');
  });
  if (SINGLE.has(state.type)) await openRecord('main');
}

for (const [k, label] of Object.entries(TYPES)) {
  const o = document.createElement('option');
  o.value = k;
  o.textContent = label;
  els.type.appendChild(o);
}
els.type.addEventListener('change', switchType);
els.filter.addEventListener('change', () => guarded(() => loadList(false)));
els.more.addEventListener('click', () => guarded(() => loadList(true)));
els.newBtn.addEventListener('click', onNew);
els.create.addEventListener('click', onCreate);
els.save.addEventListener('click', onSave);
els.trash.addEventListener('click', onTrash);
els.restore.addEventListener('click', onRestore);
els.purge.addEventListener('click', onPurge);
els.download.addEventListener('click', downloadMine);
els.reload.addEventListener('click', loadConflict);
els.auditMore.addEventListener('click', () => guarded(() => loadAudit(true)));
els.auditBox.addEventListener('toggle', () => {
  if (els.auditBox.open && !state.auditLoaded) {
    state.auditLoaded = true;
    guarded(() => loadAudit(false));
  }
});

switchType();
