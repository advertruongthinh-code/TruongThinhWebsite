// Minimal operations page script: build status, save load tests (cms-plan P1), test upload and media list (P3).

const $ = (id) => document.getElementById(id);
const logEl = $('log');
const buttons = [$('save1'), $('save10'), $('stale10'), $('uploadTest'), $('uploadVideoTest'), $('mediaReload'), $('rebuild'), $('resume')];

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
    renderRollback(data);
    el.textContent = Object.entries(data).map(([k, v]) => k + ': ' + JSON.stringify(v)).join('\n') || '(trống)';
  } catch (e) {
    el.textContent = 'Không tải được trạng thái build.';
  }
}

// Rollback panel (cms-plan P6): 10 deployments, a confirm <dialog> per older one, 3 latest rollback runs, resume button.
const when = (iso) => (iso ? new Date(iso).toLocaleString('vi-VN') : '?');
const RUN_TEXT = { success: 'xong', failure: 'lỗi', cancelled: 'bị hủy, bấm lại' };

function item(parts, action) {
  const li = document.createElement('li');
  for (const part of parts) {
    const span = document.createElement(part.code ? 'code' : 'span');
    span.textContent = part.text;
    li.append(span);
  }
  if (action) li.append(action);
  return li;
}

function renderRollback(data) {
  const deployments = data.deployments || [];
  const repoBuild = deployments[0] && !deployments[0].snapshotId;
  $('pausedNote').textContent = data.paused
    ? 'Tự đăng đang tạm dừng.' + (repoBuild ? ' Site đang dựng từ repo: lần merge code kế tiếp sẽ đè bản đã quay về.' : '')
    : '';
  $('resume').hidden = !data.paused;
  $('deployList').replaceChildren(...deployments.map((d, index) => {
    const parts = [{ text: when(d.at) }, { text: (d.commit || '').slice(0, 7), code: true }, { text: d.snapshotId ? d.snapshotId.slice(0, 8) : 'từ repo', code: Boolean(d.snapshotId) }];
    if (index === 0) return item([...parts, { text: '(đang chạy)' }]);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Quay về bản này';
    button.addEventListener('click', () => askRollback(d));
    return item(parts, button);
  }));
  if (!deployments.length) $('deployList').replaceChildren(item([{ text: 'Chưa có lần deploy nào có dấu.' }]));
  const runs = data.rollbackRuns;
  $('rollbackRuns').replaceChildren(...(runs === null
    ? [item([{ text: 'Không đọc được GitHub.' }])]
    : runs.length ? runs.map((r) => {
      const link = document.createElement('a');
      if (String(r.html_url).startsWith('https://github.com/')) link.href = r.html_url;
      link.textContent = 'xem run';
      return item([{ text: when(r.created_at) }, { text: r.status === 'completed' ? (RUN_TEXT[r.conclusion] || r.conclusion) : 'đang chạy' }], link);
    }) : [item([{ text: 'Chưa quay về lần nào.' }])]));
}

function askRollback(d) {
  const dialog = $('rollbackDialog');
  $('rollbackQuestion').textContent = 'Quay staging về bản ' + when(d.at) + ' (commit ' + (d.commit || '').slice(0, 7) + ')?';
  dialog.returnValue = '';
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'ok') run(() => ownerCall('rollback', { versionId: d.versionId }));
  }, { once: true });
  dialog.showModal();
}

async function ownerCall(command, body) {
  const out = $('rollbackLog');
  const r = await timed(command, '/api/admin/' + command, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, out);
  if (r.status === 403) log('Chỉ owner.', out);
  await loadBuildStatus();
}

$('resume').addEventListener('click', () => run(() => ownerCall('resume-publish', {})));

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

// Upload one test MP4: the first decoded frame becomes the WebP poster, then the video follows with the size the browser shows (after rotation).
async function uploadVideoTest() {
  const out = $('uploadLog');
  const file = $('testVideo').files[0];
  if (!file) { log('Chọn một video MP4 trước.', out); return; }
  const video = document.createElement('video');
  video.muted = true;
  video.src = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('error', reject, { once: true });
    });
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const poster = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!poster) throw new Error('poster');
    const alts = (vi, en) => ({ altVi: vi, altEn: en });
    const size = { width: String(video.videoWidth), height: String(video.videoHeight) };
    const first = await timed('upload poster', '/api/admin/upload-media?' + new URLSearchParams({ slugBase: 'thu-poster', ...size, ...alts('Poster thử', 'Test poster') }), { method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: poster }, out);
    if (first.status !== 201) return;
    const query = new URLSearchParams({ slugBase: 'thu-video', ...size, duration: String(video.duration), posterId: first.data.id, ...alts('Video thử', 'Test video') });
    const second = await timed('upload video', '/api/admin/upload-media?' + query, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: file }, out);
    log(JSON.stringify(second.data), out);
  } catch (e) {
    log('Không đọc được video.', out);
  } finally {
    URL.revokeObjectURL(video.src);
  }
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
$('uploadVideoTest').addEventListener('click', () => run(uploadVideoTest));
$('mediaReload').addEventListener('click', () => run(loadMediaList));

loadBuildStatus();
loadMediaList();
