// The editor's one session: the open record and its draft on this machine (cms-editor R8). Logic in src/cms/draft-session.mjs.
import { call } from "./api.js";
import { createSession } from "./lib/src/cms/draft-session.mjs";

export { DRAFT_PREFIX, draftKey, listDrafts } from "./lib/src/cms/draft-session.mjs";
export const session = createSession({ call, storage: localStorage });
