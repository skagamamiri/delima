console.log("🔥 parent-notification.js LOADED");
// ======================================================
// PORTAL DELIMA - PARENT PUSH NOTIFICATION 
// ======================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getMessaging,
  getToken
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging.js";


// ======================================================
// FIREBASE CONFIG
// ======================================================

const firebaseConfig = {

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

};


// ======================================================
// VAPID KEY
// ======================================================

const VAPID_KEY =
  "BK5wdDWPAGVNoFvNTJE5jML_6J4vEeybLBSdYh5hyKM4ZL9eOMjWqwxr4TXA5Xg-uwspY6ndOnFX7d4CPvtF8iw";


// ======================================================
// APPS SCRIPT
// ======================================================

const PUSH_API =
  "https://script.google.com/macros/s/AKfycbzWvfXVDh6y2ttNc3ySkVcymqEfgmsI7K-wwGY4ve_m_y78HfVIi55k7kyzllgGVnB4/exec";


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const firebaseApp =
  initializeApp(firebaseConfig);

const messaging =
  getMessaging(firebaseApp);


// ======================================================
// DEVICE ID
// ======================================================

function getParentDeviceId() {

  let id =
    localStorage.getItem(
      "delimaParentDeviceId"
    );

  if (!id) {

    if (
      window.crypto &&
      typeof crypto.randomUUID === "function"
    ) {

      id =
        crypto.randomUUID();

    } else {

      id =
        "device-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2);

    }

    localStorage.setItem(
      "delimaParentDeviceId",
      id
    );

  }

  return id;

}


// ======================================================
// PLATFORM
// ======================================================

function getParentPlatform() {

  const ua =
    navigator.userAgent.toLowerCase();

  if (
    /iphone|ipad|ipod/.test(ua)
  ) {

    return "IOS";

  }

  if (
    /android/.test(ua)
  ) {

    return "ANDROID";

  }

  return "WEB";

}


// ======================================================
// iOS STANDALONE
// ======================================================

function isIOSDevice() {

  return /iphone|ipad|ipod/i
    .test(navigator.userAgent);

}


function isStandalonePWA() {

  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    window.navigator.standalone === true
  );

}


// ======================================================
// ENABLE PARENT NOTIFICATION
// ======================================================

async function enableParentNotifications() {

  const button =
    document.getElementById(
      "enableParentNotificationBtn"
    );

  const status =
    document.getElementById(
      "parentNotificationStatus"
    );

  console.log(
    "🔎 delimaLiveChat:",
    window.delimaLiveChat
  );

  console.log(
    "🔎 Notification permission:",
    Notification.permission
  );

  try {

    // ======================================
    // PASTIKAN PARENT SUDAH LOGIN CHAT
    // ======================================

    const chat =
      window.delimaLiveChat;

    if (
      !chat ||
      !chat.chatId ||
      !chat.sessionId
    ) {

      if (status) {
        status.textContent =
          "⚠️ Sila mulakan Chat dengan Admin ICT dahulu.";
      }

      return;
    }

    console.log(
      "✅ Chat validation passed:",
      chat
    );


   


    // ----------------------------------------------
    // Browser support
    // ----------------------------------------------

    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {

      if (status) {

        status.textContent =
          "❌ Peranti ini tidak menyokong notifikasi.";

      }

      return;

    }


    // ----------------------------------------------
    // iPhone / iPad
    // ----------------------------------------------

    if (
      isIOSDevice() &&
      !isStandalonePWA()
    ) {

      alert(
        "Untuk mengaktifkan notifikasi pada iPhone/iPad:\n\n" +
        "1. Buka Portal DELIMa menggunakan Safari.\n" +
        "2. Tekan butang Share.\n" +
        "3. Pilih Add to Home Screen.\n" +
        "4. Buka Portal DELIMa dari Home Screen.\n" +
        "5. Login Chat semula.\n" +
        "6. Tekan Aktifkan Notifikasi."
      );

      if (status) {

        status.textContent =
          "📱 Install Portal DELIMa pada Home Screen dahulu.";

      }

      return;

    }


    if (button) {

      button.disabled = true;

      button.textContent =
        "⏳ Mengaktifkan...";

    }


    if (status) {

      status.textContent =
        "Meminta kebenaran notifikasi...";

    }


    // ==================================================
    // PERMISSION
    // ==================================================
    console.log("🚀 Sampai sebelum requestPermission");

console.log(
  "Support:",
  {
    notification: "Notification" in window,
    serviceWorker: "serviceWorker" in navigator,
    ios: isIOSDevice(),
    standalone: isStandalonePWA()
  }
);
    const permission =
      await Notification.requestPermission();
console.log(
  "🔔 Permission result:",
  permission
);

    if (permission !== "granted") {

      throw new Error(
        "NOTIFICATION_PERMISSION_DENIED"
      );

    }


    if (status) {

      status.textContent =
        "Mendaftarkan peranti...";

    }


    // ==================================================
    // SERVICE WORKER
    // ==================================================

    const registration =
      await navigator.serviceWorker.ready;


    // ==================================================
    // FIREBASE TOKEN
    // ==================================================

    const token =
      await getToken(
        messaging,
        {

          vapidKey:
            VAPID_KEY,

          serviceWorkerRegistration:
            registration

        }
      );


    if (!token) {

      throw new Error(
        "FCM_TOKEN_EMPTY"
      );

    }


    // ==================================================
    // REGISTER TOKEN KE GOOGLE APPS SCRIPT
    // ==================================================

    const url =
      PUSH_API +
      "?action=registerPushToken" +

      "&token=" +
      encodeURIComponent(token) +

      "&role=PARENT" +

      "&chatId=" +
      encodeURIComponent(
        chat.chatId
      ) +

      "&sessionId=" +
      encodeURIComponent(
        chat.sessionId
      ) +

      "&deviceId=" +
      encodeURIComponent(
        getParentDeviceId()
      ) +

      "&platform=" +
      encodeURIComponent(
        getParentPlatform()
      ) +

      "&_=" +
      Date.now();


    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "HTTP_" +
        response.status
      );

    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "REGISTER_FAILED"
      );

    }


    // ==================================================
    // SIMPAN STATUS
    // ==================================================

    localStorage.setItem(
      "delimaParentFcmToken",
      token
    );


    localStorage.setItem(
      "delimaParentNotificationChatId",
      chat.chatId
    );


    if (button) {

      button.textContent =
        "🔔 Notifikasi Aktif";

      button.disabled =
        true;

    }


    if (status) {

      status.textContent =
        "✅ Anda akan menerima notifikasi apabila Admin ICT membalas.";

    }


    console.log(
      "Parent notification registered:",
      {
        chatId:
          chat.chatId,

        platform:
          getParentPlatform()
      }
    );


  } catch (error) {

    console.error(
      "Parent notification error:",
      error
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "🔔 Aktifkan Notifikasi";

    }


    if (status) {

      if (
        String(error.message) ===
        "NOTIFICATION_PERMISSION_DENIED"
      ) {

        status.textContent =
          "⚠️ Kebenaran notifikasi tidak diberikan.";

      } else {

        status.textContent =
          "❌ Notifikasi gagal diaktifkan. Sila cuba lagi.";

      }

    }

  }

}


// ======================================================
// BUTTON
// ======================================================

function setupParentNotificationButton() {

  const button =
    document.getElementById(
      "enableParentNotificationBtn"
    );

  console.log(
    "🔍 Notification button:",
    button
  );

  if (!button) {
    console.error(
      "❌ Butang notification tidak dijumpai"
    );
    return;
  }

  button.addEventListener(
    "click",
    async function () {

      console.log(
        "🔔 BUTTON CLICKED"
      );

      await enableParentNotifications();

    }
  );

  console.log(
    "✅ Notification click listener READY"
  );
}


if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    setupParentNotificationButton
  );

} else {

  setupParentNotificationButton();

}
