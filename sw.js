// Bump CACHE when any file changes so phones pick up the new version.
const CACHE = "count-converter-v1.3.1";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "manual.pdf",
  "icon-192.png",
  "icon-512.png",
  "maskable-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first: the app always opens from the phone, even with no internet or if the site is down.
// In the background it checks for a newer copy and stores it for the next launch.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  const isPage = req.mode === "navigate";
  const key = isPage ? "index.html" : req;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const network = fetch(new Request(req.url, { cache: "no-cache" })).then(res => {
        if (res && res.ok) cache.put(key, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(network); return cached; }
      const res = await network;
      return res || (isPage ? cache.match("index.html") : Response.error());
    })
  );
});

// lets the page ask which version is running
self.addEventListener("message", e => {
  if (e.data === "GET_VERSION" && e.ports[0]) e.ports[0].postMessage(CACHE);
});
