// The game's service worker. It is what lets Chrome offer to install the page, and it keeps the game playable with no
// signal: whatever the game loads is kept, so an offline launch opens the last version that was fetched. The build is
// one bundle, so there is no list to precache. src/core/pwa.ts registers it, in a production build only.
const CACHE = 'upside-down-v1';
// How long a launch waits on the network before it opens the kept copy.
const PAGE_WAIT = 4000;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function keep(request, response) {
  if (response.status === 200 && response.type === 'basic') await (await caches.open(CACHE)).put(request, response);
}

// The page: the network first, so a new deploy shows up at once. With no signal, or a dead one, the kept copy.
async function page(event) {
  const { request } = event;
  try {
    const response = await Promise.race([fetch(request), new Promise((_, giveUp) => setTimeout(giveUp, PAGE_WAIT))]);
    event.waitUntil(keep(request, response.clone()));
    return response;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || (await caches.match('./')) || Response.error();
  }
}

// Everything else. The bundle's file names carry a hash of their contents, so a kept one never goes stale. The icons
// and the manifest don't, so those come from the cache at once and are fetched again for next time.
async function asset(event) {
  const { request } = event;
  const kept = await caches.match(request);
  if (kept && new URL(request.url).pathname.includes('/assets/')) return kept;
  const fresh = fetch(request).then((response) => {
    event.waitUntil(keep(request, response.clone()));
    return response;
  });
  if (!kept) return fresh;
  event.waitUntil(fresh.catch(() => {}));
  return kept;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range') || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? page(event) : asset(event));
});

// The page lists what it has loaded, so the very first visit is playable offline too, not only the second.
self.addEventListener('message', (event) => {
  const urls = (event.data?.keep ?? []).filter((url) => new URL(url, self.location).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(urls.map((url) => cache.add(url).catch(() => {})))));
});
