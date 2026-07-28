// ======================================================
// FIREBASE CLOUD MESSAGING
// ======================================================

importScripts(
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js"
);


firebase.initializeApp({

  apiKey:
    "AIzaSyAJKSa245Vio8tt-YMXHs3r6eTxt_SMjyQ",

  authDomain:
    "skam-delima.firebaseapp.com",

  projectId:
    "skam-delima",

  storageBucket:
    "skam-delima.firebasestorage.app",

  messagingSenderId:
    "894657583454",

  appId:
    "1:894657583454:web:d900e56dc6d44e6cc6617cf"

});


const messaging =
  firebase.messaging();


messaging.onBackgroundMessage(
  function(payload) {

    console.log(
      "[SW] Background message:",
      payload
    );

  }
);


    

  }
);


// ======================================================
// KLIK NOTIFICATION
// ======================================================

// ======================================================
// NOTIFICATION CLICK
// ======================================================

self.addEventListener(
  "notificationclick",
  function(event) {

    console.log(
      "[SW] Notification clicked",
      event.notification.data
    );

    event.notification.close();


    // URL yang dihantar oleh FCM
    let targetUrl =
      event.notification.data &&
      event.notification.data.url
        ? event.notification.data.url
        : "/delima/";


    // Pastikan URL absolute
    targetUrl =
      new URL(
        targetUrl,
        self.location.origin
      ).href;


    console.log(
      "[SW] Opening:",
      targetUrl
    );


    event.waitUntil(

      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(function(clientList) {

          // ==========================================
          // JIKA PORTAL SUDAH TERBUKA
          // ==========================================

          for (
            const client of clientList
          ) {

            const clientUrl =
              new URL(client.url);


            if (
              clientUrl.origin ===
              self.location.origin
            ) {

              return client
                .navigate(targetUrl)
                .then(function() {

                  return client.focus();

                });

            }

          }


          // ==========================================
          // JIKA PORTAL BELUM TERBUKA
          // ==========================================

          if (clients.openWindow) {

            return clients.openWindow(
              targetUrl
            );

          }

        })

    );

  }
);

const CACHE_NAME = "skamdelima-v29";

const BASE = "/delima/";

const APP_FILES = [
  BASE,
  BASE + "index.html",
  BASE + "style.css",
  BASE + "app.js",
  BASE + "manifest.json",
  BASE + "assets/logo.png",
  BASE + "assets/icon-192.png",
  BASE + "assets/icon-512.png"
];


// INSTALL
self.addEventListener("install", event => {

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
  );

  self.skipWaiting();

});


// ACTIVATE
self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))

      )

    )

  );

  self.clients.claim();

});


// FETCH
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  const url =
    new URL(event.request.url);


  // Jangan cache Google Apps Script API
  if (
    url.hostname === "script.google.com" ||
    url.hostname === "script.googleusercontent.com"
  ) {
    return;
  }


  event.respondWith(

    fetch(event.request)

      .then(response => {

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

        return response;

      })

      .catch(() =>
        caches.match(event.request)
      )

  );

});
