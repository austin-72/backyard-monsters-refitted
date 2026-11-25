/*
 * Inferno-only (QoL #243): the home-screen icon's offline page. Registered by the loader page (index.html), next to
 * it (/web/sw.js: it looks after /web/, where the icon opens the game).
 *
 * It does one thing: a page load (a navigation) that the network can't answer gets the small offline page
 * (offline.html, kept when this is installed), which tries again by itself once the connection is back. Nothing
 * else is ever kept or answered here: the game's files, its pictures and its server (/api, the chat, the arcade's
 * socket) always go to the network, untouched, as without it.
 */
const CACHE = "io-offline-1";
const OFFLINE = "offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("io-offline-") && key !== CACHE) await caches.delete(key);
    }
    // (the page's own request starts while this wakes up: no time lost on a page load)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) { /* not here */ }
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // everything but a page load: the network, as if this weren't here
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith((async () => {
    try {
      const preloaded = await event.preloadResponse;
      if (preloaded) return preloaded;
      return await fetch(request);
    } catch (e) {
      const page = await caches.match(OFFLINE, { cacheName: CACHE });
      return page || Response.error();
    }
  })());
});
