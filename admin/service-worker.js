// ======================================================
// ADMIN DELIMA SERVICE WORKER
// Scope: /delima/admin/
// ======================================================

const CACHE_NAME = "skamdelima-admin-v1";

const BASE = "/delima/admin/";

const APP_FILES = [
  BASE
];


// ======================================================
// INSTALL
// ======================================================

self.addEventListener("install", event => {

  console.log("[ADMIN SW] Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_FILES);
      })
  );

  self.skipWaiting();

});


// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener("activate", event => {

  console.log("[ADMIN SW] Activating...");

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key =>
            key.startsWith("skamdelima-admin-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))

      );

    })

  );

  self.clients.claim();

});


// ======================================================
// FETCH
// ======================================================

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }


  const url =
    new URL(event.request.url);


  // Jangan cache Apps Script
  if (
    url.hostname === "script.google.com" ||
    url.hostname === "script.googleusercontent.com"
  ) {
    return;
  }


  event.respondWith(

    fetch(event.request)

      .then(response => {

        // Cache response yang valid sahaja
        if (
          response &&
          response.status === 200 &&
          response.type !== "opaque"
        ) {

          const copy =
            response.clone();


          caches
            .open(CACHE_NAME)
            .then(cache => {

              cache.put(
                event.request,
                copy
              );

            });

        }


        return response;

      })

      .catch(() => {

        return caches.match(
          event.request
        );

      })

  );

});
