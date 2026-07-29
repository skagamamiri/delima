// ======================================================
// ADMIN DELIMA SERVICE WORKER
// Scope: /delima/admin/
// Firebase Cloud Messaging + Cache
// ======================================================


// ======================================================
// FIREBASE
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


// ======================================================
// BACKGROUND FCM
// ======================================================

messaging.onBackgroundMessage(
  function(payload) {

    console.log(
      "[ADMIN SW] Background FCM:",
      payload
    );


    /*
      PENTING:

      Jika FCM dihantar menggunakan
      notification payload, browser/Firebase
      boleh memaparkan notification sendiri.

      Jadi kita TIDAK panggil
      showNotification() di sini untuk
      mengelakkan DOUBLE NOTIFICATION.
    */


    const targetUrl =
      payload.data?.url ||
      payload.fcmOptions?.link ||
      "/delima/admin/?openChat=1";


    console.log(
      "[ADMIN SW] Target:",
      targetUrl
    );

  }
);


// ======================================================
// NOTIFICATION CLICK
// ======================================================

self.addEventListener(
  "notificationclick",
  function(event) {

    console.log(
      "[ADMIN SW] Notification clicked:",
      event.notification.data
    );


    event.notification.close();


    let targetUrl =
      event.notification?.data?.url ||
      "/delima/admin/?openChat=1";


    // Pastikan URL absolute
    targetUrl =
      new URL(
        targetUrl,
        self.location.origin
      ).href;


    console.log(
      "[ADMIN SW] Opening:",
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
          // ADMIN SUDAH TERBUKA
          // ==========================================

          for (
            const client of clientList
          ) {

            const clientUrl =
              new URL(
                client.url
              );


            /*
              Fokus hanya window Admin.

              Jangan navigate Parent portal.
            */

            if (
              clientUrl.origin ===
                self.location.origin &&

              clientUrl.pathname.startsWith(
                "/delima/admin/"
              )
            ) {

              return client
                .navigate(
                  targetUrl
                )

                .then(function() {

                  return client.focus();

                });

            }

          }


          // ==========================================
          // ADMIN BELUM TERBUKA
          // ==========================================

          if (
            clients.openWindow
          ) {

            return clients.openWindow(
              targetUrl
            );

          }

        })

    );

  }
);


// ======================================================
// CACHE
// ======================================================

const CACHE_NAME =
  "skamdelima-admin-v2";


const BASE =
  "/delima/admin/";


const APP_FILES = [
  BASE
];


// ======================================================
// INSTALL
// ======================================================

self.addEventListener(
  "install",
  function(event) {

    console.log(
      "[ADMIN SW] Installing v2..."
    );


    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )

        .then(function(cache) {

          return cache.addAll(
            APP_FILES
          );

        })

    );


    self.skipWaiting();

  }
);


// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener(
  "activate",
  function(event) {

    console.log(
      "[ADMIN SW] Activating v2..."
    );


    event.waitUntil(

      caches
        .keys()

        .then(function(keys) {

          return Promise.all(

            keys

              .filter(function(key) {

                return (
                  key.startsWith(
                    "skamdelima-admin-"
                  ) &&
                  key !== CACHE_NAME
                );

              })

              .map(function(key) {

                console.log(
                  "[ADMIN SW] Delete old cache:",
                  key
                );


                return caches.delete(
                  key
                );

              })

          );

        })

    );


    self.clients.claim();

  }
);


// ======================================================
// FETCH
// ======================================================

self.addEventListener(
  "fetch",
  function(event) {


    if (
      event.request.method !== "GET"
    ) {

      return;

    }


    const url =
      new URL(
        event.request.url
      );


    // ==========================================
    // JANGAN CACHE GOOGLE APPS SCRIPT
    // ==========================================

    if (
      url.hostname ===
        "script.google.com" ||

      url.hostname ===
        "script.googleusercontent.com"
    ) {

      return;

    }


    // ==========================================
    // JANGAN CACHE FIREBASE / GOOGLE API
    // ==========================================

    if (
      url.hostname.includes(
        "firebase"
      ) ||

      url.hostname ===
        "fcmregistrations.googleapis.com"
    ) {

      return;

    }


    // ==========================================
    // NETWORK FIRST
    // ==========================================

    event.respondWith(

      fetch(
        event.request
      )

        .then(function(response) {


          if (
            response &&
            response.status === 200 &&
            response.type !== "opaque"
          ) {

            const copy =
              response.clone();


            caches
              .open(
                CACHE_NAME
              )

              .then(function(cache) {

                cache.put(
                  event.request,
                  copy
                );

              });

          }


          return response;

        })


        // ======================================
        // OFFLINE FALLBACK
        // ======================================

        .catch(function() {

          return caches.match(
            event.request
          );

        })

    );

  }
);
