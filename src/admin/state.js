// Shared editor state (CMS plan E12): the signed-in user and the open record. Panels listen to "open" on `state`.
const OPEN_KEY = "tt-cms-open";
export const state = Object.assign(new EventTarget(), { user: null, open: null, block: null, previewError: "" });

// record: { type, id, name, status, version, data } as `get` returns it.
export function setOpen(record) {
  state.open = record;
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify({ type: record.type, id: record.id }));
  } catch {}
  state.dispatchEvent(new Event("open"));
}

export function lastOpen() {
  try {
    const value = JSON.parse(localStorage.getItem(OPEN_KEY));
    if (typeof value?.type === "string" && typeof value?.id === "string") return value;
  } catch {}
  return { type: "page-copy", id: "home" };
}

// "Chưa lưu" label: a draft of this record on this machine (cms-editor R8; E13 writes them).
export const hasDraft = (type, id) => {
  try {
    return localStorage.getItem(`tt-cms-draft:${type}:${id}`) !== null;
  } catch {
    return false;
  }
};

// The block selected on the preview (index into the page's blocks) or null; the Thông tin tab shows its text fields.
export function selectBlock(index) {
  state.block = index;
  state.dispatchEvent(new Event("block"));
}
