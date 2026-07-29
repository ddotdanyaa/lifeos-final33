const LIFEOS_CACHE = "lifeos-v34-ea1a6ab";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  // П7: чистый слой вынесен из app.js в модуль. Оболочка обязана его кэшировать — иначе офлайн
  // приложение падает на первом же импорте, а не работает без сети.
  "/core/text.mjs",
  "/core/ru-parse.mjs",
  "/core/speech-intents.mjs",
  "/core/graph-math.mjs",
  "/core/ru-money.mjs",
  "/core/ru-entities.mjs",
  "/core/owner-themes.mjs",
  "/core/format.mjs",
  // П40/П41: новые чистые слои обязаны быть в precache — иначе офлайн падает на первом
  // импорте, а не «работает без сети».
  "/core/donor-intake.mjs",
  "/core/day-correlations.mjs",
  "/core/on-this-day.mjs",
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
