// Minimal operations page script: build status, save load tests (cms-plan P1), test upload and media list (P3).

const $ = (id) => document.getElementById(id);
const logEl = $('log');
const buttons = [$('save1'), $('save10'), $('stale10'), $('uploadTest'), $('mediaReload'), $('rebuild')];

function log(line, out = logEl) {
  out.textContent += line + '\n';
}

// Fetch and log "label: HTTP status, elapsed ms"; returns { status, data }.
async function timed(label, url, init, out = logEl) {
  const t0 = performance.now();
  let status = 0;
  let data = null;
  try {
    const res = await fetch(url, init);
    status = res.status;
    try { data = await res.json(); } catch (e) { data = null; }
  } catch (e) {
    log(label + ': lỗi mạng', out);
    return { status, data };
  }
  log(label + ': HTTP ' + status + ', ' + Math.round(performance.now() - t0) + ' ms', out);
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

const TOKEN_WARN_MS = 14 * 86400000;

// The two warning lines of CMS plan P4 item 4.
function warnings(data) {
  const lines = [];
  const snapshotAt = data.deployments && data.deployments[0] && data.deployments[0].snapshotAt;
  if (data.lastSaveAt && (!snapshotAt || data.lastSaveAt > snapshotAt)) lines.push('Site chậm hơn lần lưu cuối: lần dựng gần nhất chưa chứa nội dung mới.');
  const expires = Date.parse(data.tokenExpiresAt);
  if (data.runs === null) lines.push('Không đọc được GitHub: token thiếu, sai hoặc hết hạn. Đổi theo runbook.');
  else if (expires - Date.now() < TOKEN_WARN_MS) lines.push('Token GitHub hết hạn ngày ' + data.tokenExpiresAt + ' (còn dưới 14 ngày): đổi theo runbook.');
  return lines;
}

async function rebuild() {
  await timed('rebuild', '/api/admin/rebuild', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await loadBuildStatus();
}

async function loadBuildStatus() {
  const el = $('buildStatus');
  try {
    const res = await fetch('/api/admin/build-status');
    const data = await res.json();
    if (!res.ok) {
      el.textContent = 'Lỗi ' + res.status + ': ' + (data && data.error);
      return;
    }
    $('buildWarnings').textContent = warnings(data).join('\n');
    el.textContent = Object.entries(data).map(([k, v]) => k + ': ' + JSON.stringify(v)).join('\n') || '(trống)';
  } catch (e) {
    el.textContent = 'Không tải được trạng thái build.';
  }
}

// Upload one test image as media thu-NN: the browser reads the EXIF-rotated size, the body is the raw file.
async function uploadTest() {
  const out = $('uploadLog');
  const file = $('testFile').files[0];
  if (!file) { log('Chọn một ảnh trước.', out); return; }
  let size;
  try {
    const bitmap = await createImageBitmap(file);
    size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
  } catch (e) {
    log('Không đọc được ảnh.', out);
    return;
  }
  const query = new URLSearchParams({ slugBase: 'thu', width: String(size.width), height: String(size.height) });
  const r = await timed('upload-media', '/api/admin/upload-media?' + query, { method: 'POST', headers: { 'Content-Type': file.type }, body: file }, out);
  log(JSON.stringify(r.data), out);
  await loadMediaList();
}

// First page of media-list: id, status and the full-frame variant (key, status, error).
async function loadMediaList() {
  const el = $('mediaList');
  try {
    const res = await fetch('/api/admin/media-list');
    const data = await res.json();
    if (!res.ok) {
      el.textContent = 'Lỗi ' + res.status + ': ' + (data && data.error);
      return;
    }
    el.textContent = data.items.map((item) => {
      const v = item.variant;
      return item.id + '  ' + item.status + '  ' + (v ? 'variant ' + v.status + (v.error ? ' ' + v.error : '') + ' ' + v.key : 'repo');
    }).join('\n') || '(trống)';
  } catch (e) {
    el.textContent = 'Không tải được media.';
  }
}

$('uploadTest').addEventListener('click', () => run(uploadTest));
$('rebuild').addEventListener('click', () => run(rebuild));
$('mediaReload').addEventListener('click', () => run(loadMediaList));

loadBuildStatus();
loadMediaList();
