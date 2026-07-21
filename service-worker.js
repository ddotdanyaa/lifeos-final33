const LIFEOS_CACHE = "lifeos-v34-d23ae0f7";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/artifact-os-architecture.mjs",
  "/manifest.webmanifest",
  "/assets/lifeos-icon.svg",
  "/assets/lifeos-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(LIFEOS_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== LIFEOS_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(LIFEOS_CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(LIFEOS_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(LIFEOS_CACHE).then((cache) => cache.put(request, copy));
        return response;
      }))
  );
});
