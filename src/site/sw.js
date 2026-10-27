// Đếm byte ảnh JXL đang tải, báo tab khi đủ ngưỡng chất lượng để khung gỡ vệt sáng, Kính (progressive-loading R3).
// Chỉ nhận GET cùng origin tới /assets/content/**/*.jxl, chuyển tiếp nguyên luồng; request khác không đi qua.
// Gỡ khẩn cấp: thay file này bằng bản chỉ gọi self.registration.unregister() (header no-cache nên tab nhận ngay lần sau).
let thresholds;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin
    || !url.pathname.startsWith("/assets/content/") || !url.pathname.endsWith(".jxl")) return;
  event.respondWith((async () => {
    thresholds ??= fetch("/assets/content/jxl-thresholds.json").then((response) => response.json()).catch(() => ({}));
    const [response, table] = await Promise.all([fetch(event.request), thresholds]);
    const limit = table[url.pathname.slice(1)];
    if (!limit || !response.body || response.status !== 200) return response;
    let seen = 0;
    const body = response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (seen < limit && (seen += chunk.byteLength) >= limit) {
          self.clients.get(event.clientId).then((client) => client?.postMessage({ url: url.pathname }));
        }
      },
    }));
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  })());
});
