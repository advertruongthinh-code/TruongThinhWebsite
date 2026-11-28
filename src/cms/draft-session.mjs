// The open record of the editor with its draft on this machine (cms-editor R8, CMS plan E13): open, change with undo, keep the draft in
// storage, save with the result table of R8. No DOM and no globals: `call` (the admin API) and `storage` (localStorage) come in, so
// tests run it with fakes. Listeners hear "open", "change", "storage-full", "other-tab".
import { isLegacy, mediaRefs } from "./media-ref.mjs";
import { fitMessage } from "./errors-vi.mjs";
import { fitCrops, kindOf, pageMedia, relayout, sameMedia } from "./page-model.mjs";

export const DRAFT_PREFIX = "tt-cms-draft:";
export const draftKey = (type, id) => `${DRAFT_PREFIX}${type}:${id}`;
const GROUP_MS = 800; // typing in one field inside this gap is one undo step
const UNDO_MAX = 100;
const RETRY = "Chưa lưu được, nháp vẫn ở máy này. Thử lại sau.";

// What the Worker gets: a placement is only its media and crop (the Worker writes src, size and alt itself); a seeded one stays as is.
export function wireData(type, data) {
  const copy = structuredClone(data);
  for (const ref of mediaRefs(type, copy)) {
    if (isLegacy(ref)) continue;
    for (const key of Object.keys(ref)) if (key !== "mediaId" && key !== "crop") delete ref[key];
  }
  return copy;
}

// Records that have a draft on this machine: [{ type, id, name, changes }] for the Nháp panel.
export function listDrafts(storage) {
  const found = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;
    const [type, ...rest] = key.slice(DRAFT_PREFIX.length).split(":");
    try {
      const draft = JSON.parse(storage.getItem(key));
      found.push({ type, id: rest.join(":"), name: draft.data?.title?.vi || draft.data?.titleVi || rest.join(":"), changes: draft.changes ?? 0 });
    } catch { /* a damaged draft is not listed */ }
  }
  return found.toSorted((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function createSession({ call, storage, now = Date.now }) {
  const events = new EventTarget();
  const emit = (name) => events.dispatchEvent(new Event(name));
  const undoStack = [];
  let lastGroup = null;
  let lastAt = 0;
  let rev = 0; // bumped by every edit and undo, merged typing included: a save compares it to see what was typed while it was out
  let inflight = null;
  // record: { type, id, status, version, pending, updatedBy, updatedAt, variants }; conflict: { current } of R8's 409 dialog.
  const s = { record: null, data: null, media: null, mediaById: new Map(), baseVersion: 0, changes: 0, conflict: null, storageFull: false };
  const key = () => draftKey(s.record.type, s.record.id);
  const isPage = () => s.record.type === "news" || s.record.type === "project";

  function persist() {
    try {
      if (s.changes === 0) storage.removeItem(key());
      else storage.setItem(key(), JSON.stringify({ baseVersion: s.baseVersion, data: s.data, media: s.media, changes: s.changes, records: placedRecords() }));
      s.storageFull = false;
    } catch {
      s.storageFull = true;
      emit("storage-full");
    }
  }
  // Media records the draft places: a record picked in the library is not in the server copy, so the draft carries it.
  const placedRecords = () => Object.fromEntries(mediaRefs(s.record.type, s.data).map((ref) => [ref.mediaId, s.mediaById.get(ref.mediaId)]).filter(([id, record]) => id && record));
  function loadDraft() {
    try {
      return JSON.parse(storage.getItem(key()));
    } catch {
      return null;
    }
  }
  function restore(draft) {
    Object.assign(s, { data: draft.data, media: draft.media ?? (isPage() ? pageMedia(draft.data) : null), baseVersion: draft.baseVersion, changes: draft.changes ?? 1 });
    for (const [id, record] of Object.entries(draft.records ?? {})) s.mediaById.set(id, record);
  }

  // Layout and media of a page: null while the blocks hold exactly the media list, else why the layout cannot hold it (the save waits).
  const fit = () => (!isPage() || sameMedia(pageMedia(s.data), s.media) ? null
    : relayout(kindOf(s.record.type), s.data, s.data.layout, s.media).error ?? "stale");

  return {
    state: s,
    events,
    fit,
    async open(type, id) {
      const result = await call("get", { query: { type, id } });
      if (result.error) return result;
      const { data, media, ...record } = result.data;
      undoStack.length = 0;
      lastGroup = null;
      s.record = { ...record, data: undefined };
      s.mediaById = new Map(Object.entries(media ?? {}));
      Object.assign(s, { data: structuredClone(data), media: isPage() ? pageMedia(data) : null, baseVersion: record.version, changes: 0, conflict: null });
      const draft = loadDraft();
      if (draft) {
        restore(draft);
        // A draft made on an older version: R8 shows the 409 dialog before any more editing.
        if (draft.baseVersion < record.version) s.conflict = { current: { version: record.version, data, updatedBy: record.updatedBy, updatedAt: record.updatedAt } };
      }
      emit("open");
      return result;
    },
    // fn changes s.data and s.media; `group` merges typing in one field into one undo step.
    mutate(fn, { group } = {}) {
      const at = now();
      const merged = Boolean(group) && group === lastGroup && at - lastAt < GROUP_MS;
      const before = structuredClone({ data: s.data, media: s.media, changes: s.changes });
      try {
        fn(s);
      } catch (error) {
        Object.assign(s, before); // a failed edit leaves no half change, no undo step
        throw error;
      }
      if (!merged) {
        undoStack.push(before);
        if (undoStack.length > UNDO_MAX) undoStack.shift();
        s.changes += 1;
      }
      lastGroup = group ?? null;
      lastAt = at;
      rev += 1;
      persist();
      emit("change");
    },
    undo() {
      const previous = undoStack.pop();
      if (!previous) return false;
      Object.assign(s, previous);
      lastGroup = null;
      rev += 1;
      persist();
      emit("change");
      return true;
    },
    canUndo: () => undoStack.length > 0,
    // Puts a new media list on the page under `layoutId` (default: the current one); the block chain follows when the count fits.
    setMedia(list, layoutId = s.data.layout) {
      this.mutate(() => {
        s.media = list;
        s.data.layout = layoutId;
        const result = relayout(kindOf(s.record.type), s.data, layoutId, list);
        if (!result.error) {
          s.data.blocks = result.blocks;
          fitCrops(s.record.type, s.data, s.mediaById);
        }
      });
    },
    // A media record picked in the library: kept so the draft can be validated and previewed with it.
    addMediaRecord(record) {
      s.mediaById.set(record.id, record);
    },
    // A change from another tab of the same record (storage event): take its draft.
    otherTab() {
      const draft = loadDraft();
      if (draft) {
        restore(draft);
        undoStack.length = 0; // the other tab's edits are not this tab's history
        lastGroup = null;
        rev += 1;
      }
      emit("other-tab");
      emit("change");
    },
    discard() {
      s.changes = 0;
      persist();
    },
    // "Lấy bản mới" (take) or "Giữ bản của tôi" (keep) of the 409 dialog.
    async resolve(choice) {
      const { current } = s.conflict;
      if (choice === "take") {
        // The stored draft goes first (open would read it back); it comes back when the new version cannot be fetched.
        const kept = storage.getItem(key());
        storage.removeItem(key());
        const result = await this.open(s.record.type, s.record.id);
        if (result.error && kept !== null) storage.setItem(key(), kept);
        return result;
      }
      s.baseVersion = current.version;
      s.conflict = null;
      persist();
      return this.save();
    },
    saving: () => inflight !== null,
    // R8 table. Returns { kind, message, errors?, missing?, field? }; the draft stays unless the save went through. One save at a time:
    // a second call gets the one that is out (it would send the same baseVersion and conflict with the first).
    save() {
      inflight ??= this.send().finally(() => { inflight = null; });
      return inflight;
    },
    async send() {
      if (s.conflict) return { kind: "conflict", message: "" };
      const blocked = fit();
      if (blocked) return { kind: "fit", message: fitMessage(blocked) };
      const { type, id } = s.record;
      const sent = rev;
      const sentChanges = s.changes;
      const result = await call("save", { body: { type, id, version: s.baseVersion, data: wireData(type, s.data) } });
      if (!result.error) {
        const { status, missing, pending } = result.data;
        // Edits typed while the request was out stay in a new draft on top of the saved version.
        const later = rev !== sent ? { data: s.data, media: s.media, changes: Math.max(1, s.changes - sentChanges), records: placedRecords() } : null;
        s.changes = 0;
        persist();
        await this.open(type, id);
        if (later) {
          for (const [rid, record] of Object.entries(later.records)) s.mediaById.set(rid, record);
          Object.assign(s, { data: later.data, media: later.media, changes: later.changes });
          persist();
          emit("change");
        }
        if (status === "draft") return { kind: "draft", message: `Đã lưu nháp. Còn thiếu ${missing.length} mục.`, missing };
        return { kind: "saved", message: pending > 0 ? `Đã lưu. Đang xử lý ${pending} media, xong sẽ tự lên staging.` : "Đã lưu. Đang đưa lên staging." };
      }
      const { error, status, data } = result;
      if (error === "forbidden") return { kind: "forbidden", message: "Tài khoản không có quyền này." };
      if (error === "session") return { kind: "session", message: "Phiên đăng nhập hết hạn. Tải lại trang, nháp vẫn ở máy này." };
      if (error === "unavailable" || error === "offline") return { kind: "retry", message: RETRY };
      if (error === "shape") return { kind: "invalid", message: "Chưa lưu được: có chỗ chưa hợp lệ.", errors: data.errors ?? [] };
      if (error === "missing") return { kind: "invalid", message: `Chưa lưu được: còn thiếu ${data.missing?.length ?? 0} mục.`, errors: data.missing ?? [] };
      if (error === "version") {
        s.conflict = { current: data.current };
        emit("change");
        return { kind: "conflict", message: "" };
      }
      if (error === "slug") return { kind: "slug", message: "Link này đã có bài khác dùng.", field: "slug" };
      if (error === "slug-history-full") return { kind: "slug", message: "Bài đã đổi link quá nhiều lần. Dùng lại một link cũ.", field: "slug" };
      if (error === "trashed") return { kind: "trashed", message: "Bài này đã vào thùng rác." };
      if (error === "too-large" || status === 413) return { kind: "invalid", message: "Bài quá lớn để lưu. Bỏ bớt nội dung.", errors: [] };
      return { kind: "retry", message: RETRY };
    },
  };
}
