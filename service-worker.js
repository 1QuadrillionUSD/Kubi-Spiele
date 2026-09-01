const CACHE_VERSION = "meine-spiele-v1.7.1";
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
  "./games/autorennen/game.js",
  "./games/planetennamen/",
  "./games/planetennamen/index.html",
  "./games/planetennamen/style.css",
  "./games/planetennamen/game.js",
  "./games/planetennamen/assets/mercury-cutout.webp",
  "./games/planetennamen/assets/venus-cutout.webp",
  "./games/planetennamen/assets/earth-cutout.webp",
  "./games/planetennamen/assets/moon-cutout.webp",
  "./games/planetennamen/assets/mars-cutout.webp",
  "./games/planetennamen/assets/jupiter-cutout.webp",
  "./games/planetennamen/assets/saturn-cutout.webp",
  "./games/planetennamen/assets/uranus-cutout.webp",
  "./games/planetennamen/assets/neptune-cutout.webp",
  "./games/planetennamen/assets/pluto-cutout.webp",
  "./games/opa-maeht-den-rasen/",
  "./games/opa-maeht-den-rasen/index.html",
  "./games/opa-maeht-den-rasen/style.css",
  "./games/opa-maeht-den-rasen/js/main.js",
  "./games/opa-maeht-den-rasen/js/world.js",
  "./games/opa-maeht-den-rasen/js/render.js",
  "./games/opa-maeht-den-rasen/js/wildlife.js",
  "./games/opa-maeht-den-rasen/js/input.js",
  "./games/opa-maeht-den-rasen/js/audio.js",
  "./games/opa-maeht-den-rasen/js/characters.js",
  "./games/opa-maeht-den-rasen/assets/characters/opa-face-placeholder.png"
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
