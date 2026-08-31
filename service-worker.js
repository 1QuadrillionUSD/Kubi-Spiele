const CACHE_VERSION = "meine-spiele-v1.2.0";
const CACHE_NAME = `${CACHE_VERSION}-static`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/app.js",
  "./shared/ui/dom.js",
  "./shared/ui/game-shell.js",
  "./shared/utils/highscore.js",
  "./shared/utils/pwa.js",
  "./shared/utils/sound.js",
  "./shared/utils/touch.js",
  "./shared/game/game-state.js",
  "./assets/icons/icon.svg",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./games/autorennen/",
  "./games/autorennen/index.html",
  "./games/autorennen/style.css",
  "./games/autorennen/game.js"
];

const asCacheUrl = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE.map(asCacheUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("meine-spiele-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          const canCache = response.ok && response.type === "basic";
          if (canCache) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match(asCacheUrl("./index.html"));
          }
          return undefined;
        });
    })
  );
});
