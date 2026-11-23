"use strict";

// The original-image upgrade (head-inline streamOriginal, progressive-loading R10) reads a JXL original through fetch's stream reader.
// When the reader drains the body before the loader reports completion, Chromium logs the fetch as net::ERR_ABORTED although every byte
// arrived (CI trace of run 45069280658: the blob built from the stream had the file's full 219578-byte Content-Length). The site never
// cancels that fetch, so this exact case is not a load error; any other failed request still is.
const ORIGINAL_JXL = /^\/assets\/content\/.+(?<!-(?:240|480|960|1600|2048))\.jxl$/;

const isStreamedOriginalAbort = (request) => request.resourceType() === "fetch"
  && request.failure()?.errorText === "net::ERR_ABORTED"
  && ORIGINAL_JXL.test(new URL(request.url()).pathname);

module.exports = { isStreamedOriginalAbort };
