const CACHE_NAME = "kbo-fan-hub-v2";
const APP_SHELL = ["/mobile-app", "/manifest.webmanifest", "/icon.svg"];
const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "10.0.2.2"]);

function shouldBypassCache(requestUrl) {
  return (
    DEV_HOSTS.has(requestUrl.hostname) ||
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.startsWith("/_next/")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (shouldBypassCache(requestUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match("/mobile-app")),
      ),
  );
});
