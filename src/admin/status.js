// Minimal operations page script: build status and save load tests (cms-plan P1).

const $ = (id) => document.getElementById(id);
const logEl = $('log');
const buttons = [$('save1'), $('save10'), $('stale10')];

function log(line) {
  logEl.textContent += line + '\n';
}

// Fetch and log "label: HTTP status, elapsed ms"; returns { status, data }.
async function timed(label, url, init) {
  const t0 = performance.now();
  let status = 0;
  let data = null;
  try {
    const res = await fetch(url, init);
    status = res.status;
    try { data = await res.json(); } catch (e) { data = null; }
  } catch (e) {
    log(label + ': lỗi mạng');
    return { status, data };
  }
  log(label + ': HTTP ' + status + ', ' + Math.round(performance.now() - t0) + ' ms');
  return { status, data };
}

function post(label, body) {
  return timed(label, '/api/admin/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function loadRecord(id) {
  const r = await timed('get', '/api/admin/get?type=project&id=' + encodeURIComponent(id));
  if (r.status !== 200 || !r.data) {
    log('Không tải được bản ghi.');
    return null;
  }
  return r.data;
}

async function saveN(n) {
  const id = $('projectId').value.trim();
  const rec = await loadRecord(id);
  if (!rec) return;
  let version = rec.version;
  for (let i = 1; i <= n; i++) {
    const r = await post('save ' + i + '/' + n, { type: 'project', id, version, data: rec.data });
    if (r.status !== 200 || !r.data) {
      log('Dừng: lưu không thành công.');
      return;
    }
    version = r.data.version;
  }
}

async function staleN(n) {
  const id = $('projectId').value.trim();
  const rec = await loadRecord(id);
  if (!rec) return;
  for (let i = 1; i <= n; i++) {
    await post('save lệch ' + i + '/' + n + ' (mong đợi 409)', { type: 'project', id, version: rec.version - 1, data: rec.data });
  }
}

async function run(fn) {
  for (const b of buttons) b.disabled = true;
  try { await fn(); } finally { for (const b of buttons) b.disabled = false; }
}

$('save1').addEventListener('click', () => run(() => saveN(1)));
$('save10').addEventListener('click', () => run(() => saveN(10)));
$('stale10').addEventListener('click', () => run(() => staleN(10)));

async function loadBuildStatus() {
  const el = $('buildStatus');
  try {
    const res = await fetch('/api/admin/build-status');
    const data = await res.json();
    if (!res.ok) {
      el.textContent = 'Lỗi ' + res.status + ': ' + (data && data.error);
      return;
    }
    el.textContent = Object.entries(data).map(([k, v]) => k + ': ' + JSON.stringify(v)).join('\n') || '(trống)';
  } catch (e) {
    el.textContent = 'Không tải được trạng thái build.';
  }
}

loadBuildStatus();
