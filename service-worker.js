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

    const title =
      payload.notification?.title ||
      "Portal DELIMa";

    const options = {

      body:
        payload.notification?.body ||
        "Anda mempunyai notifikasi baharu.",

      icon:
        "./assets/icon-192.png",

      badge:
        "./assets/icon-192.png",

      data: {
        url:
          payload.fcmOptions?.link ||
          payload.data?.url ||
          "./admin.html"
      }

    };


    return self.registration
      .showNotification(
        title,
        options
      );

  }
);


// ======================================================
// KLIK NOTIFICATION
// ======================================================

self.addEventListener(
  "notificationclick",
  function(event) {

    event.notification.close();

    const targetUrl =
  event.notification.data?.url ||
  "./";


    event.waitUntil(

      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })

      .then(function(clientList) {

        for (
          const client of clientList
        ) {

          if (
            "focus" in client
          ) {

            client.navigate(
              targetUrl
            );

            return client.focus();

          }

        }


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

const CACHE_NAME = "skamdelima-v22";

const BASE = "/skamdelima/";

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
