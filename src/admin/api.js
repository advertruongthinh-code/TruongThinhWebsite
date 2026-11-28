// Admin commands from the editor (cms-data R7, CMS plan E12): call(command, { query, body, upload }) never throws and
// returns { status, error, data }. Reads are GET; a body is sent as JSON, an upload as the file's bytes.
// An Access session that expired answers with a redirect to the login page instead of JSON: "session" (status 0).
export const SESSION_EVENT = "tt-cms-session";
export const MESSAGES = {
  session: "Phiên đăng nhập hết hạn. Tải lại trang.",
  forbidden: "Tài khoản không có quyền này.",
  unavailable: "Chưa lưu được, nháp vẫn ở máy này. Thử lại sau.",
};

export async function call(command, { query, body, upload } = {}) {
  const search = query ? `?${new URLSearchParams(Object.entries(query).filter(([, value]) => value != null && value !== ""))}` : "";
  const init = { redirect: "manual", headers: {} };
  if (upload) Object.assign(init, { method: "POST", body: upload, headers: { "Content-Type": upload.type || "application/octet-stream" } });
  else if (body !== undefined) Object.assign(init, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  let response;
  try {
    response = await fetch(`/api/admin/${command}${search}`, init);
  } catch {
    return { status: 0, error: "offline", data: {} };
  }
  const json = (response.headers.get("Content-Type") ?? "").includes("application/json");
  if (response.type === "opaqueredirect" || response.status === 401 || !json) {
    window.dispatchEvent(new Event(SESSION_EVENT));
    return { status: response.status, error: "session", data: {} };
  }
  const data = await response.json().catch(() => ({}));
  if (response.ok) return { status: response.status, error: null, data };
  const error = response.status === 403 ? "forbidden" : response.status === 429 || response.status >= 500 ? "unavailable" : data?.error ?? "error";
  return { status: response.status, error, data: data ?? {} };
}
