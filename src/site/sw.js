// Removed threshold-based image reveal (owner 2026-10-31: images show only once fully loaded): the site no longer registers a Service Worker.
// This file only unregisters the Service Worker previously installed on clients; the no-cache header lets tabs pick up the next update check immediately.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.registration.unregister()));
