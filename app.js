const API_URL =
  "https://script.google.com/macros/s/AKfycbzWvfXVDh6y2ttNc3ySkVcymqEfgmsI7K-wwGY4ve_m_y78HfVIi55k7kyzllgGVnB4/exec";


let currentPassword = "";
let passwordVisible = false;
let deferredPrompt = null;


// =====================================
// SEARCH DELIMA
// =====================================

async function cariDelima() {

  const nokp =
    document
      .getElementById("nokp")
      .value
      .replace(/\D/g, "");

  const pin =
    document
      .getElementById("pin")
      .value
      .replace(/\D/g, "");


  const result =
    document.getElementById("result");

  const loading =
    document.getElementById("loading");

  const message =
    document.getElementById("message");

  const button =
    document.getElementById("btnCari");


  result.classList.add("hidden");

  message.innerHTML = "";


  // IC VALIDATION

  if (nokp.length !== 12) {

    showError(
      "Sila masukkan 12 digit No. KP / MyKid."
    );

    return;
  }


  // PIN VALIDATION

  if (pin.length !== 4) {

    showError(
      "Sila masukkan 4 digit PIN penjaga."
    );

    return;
  }


  loading.classList.remove("hidden");

  button.disabled = true;


  try {

    const url =
      API_URL +
      "?action=search" +
      "&nokp=" +
      encodeURIComponent(nokp) +
      "&pin=" +
      encodeURIComponent(pin) +
      "&t=" +
      Date.now();


    const response =
      await fetch(url, {
        method: "GET",
        cache: "no-store"
      });


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }


    const data =
      await response.json();


    loading.classList.add("hidden");

    button.disabled = false;


    // FAILED

    if (!data.success) {

      showError(
        data.message ||
        "Maklumat tidak sepadan atau akaun tidak dijumpai."
      );

      return;
    }


    // SUCCESS

    document
      .getElementById("nama")
      .textContent =
      data.nama || "-";


    document
      .getElementById("kelas")
      .textContent =
      data.kelas || "-";


    document
      .getElementById("delima")
      .textContent =
      data.delima || "-";


    currentPassword =
      data.password || "";


    passwordVisible = false;


    document
      .getElementById("password")
      .textContent =
      "••••••••";


    result.classList.remove("hidden");


    // Padam PIN selepas berjaya

    document
      .getElementById("pin")
      .value = "";


    result.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });


  } catch (error) {

    console.error(
      "DELIMa API Error:",
      error
    );


    loading.classList.add("hidden");

    button.disabled = false;


    showError(
      "Tidak dapat menghubungi sistem. Sila cuba lagi."
    );

  }

}


// =====================================
// ERROR
// =====================================

function showError(text) {

  document
    .getElementById("message")
    .innerHTML =
    '<div class="error">' +
    escapeHTML(text) +
    '</div>';

}


// =====================================
// PASSWORD
// =====================================

function togglePassword() {

  const password =
    document.getElementById("password");


  passwordVisible =
    !passwordVisible;


  password.textContent =
    passwordVisible
      ? (currentPassword || "-")
      : "••••••••";

}


// =====================================
// PIN SHOW / HIDE
// =====================================

function togglePin() {

  const pin =
    document.getElementById("pin");


  if (pin.type === "password") {

    pin.type = "text";

  } else {

    pin.type = "password";

  }

}


// =====================================
// COPY DELIMA
// =====================================

async function copyDelima() {

  const text =
    document
      .getElementById("delima")
      .textContent;


  await copyToClipboard(
    text,
    "ID DELIMa telah disalin."
  );

}


// =====================================
// COPY PASSWORD
// =====================================

async function copyPassword() {

  if (!currentPassword) {
    return;
  }


  await copyToClipboard(
    currentPassword,
    "Kata laluan telah disalin."
  );

}


// =====================================
// COPY
// =====================================

async function copyToClipboard(
  text,
  successMessage
) {

  try {

    await navigator.clipboard
      .writeText(text);

    showToast(successMessage);

  } catch (error) {

    console.error(error);

    showToast(
      "Tidak dapat menyalin."
    );

  }

}


// =====================================
// SIMPLE TOAST
// =====================================

function showToast(text) {

  const old =
    document.getElementById("toast");


  if (old) {
    old.remove();
  }


  const toast =
    document.createElement("div");


  toast.id = "toast";

  toast.textContent = text;


  Object.assign(
    toast.style,
    {
      position: "fixed",
      left: "50%",
      bottom: "25px",
      transform: "translateX(-50%)",
      background: "#101828",
      color: "#ffffff",
      padding: "12px 18px",
      borderRadius: "10px",
      zIndex: "9999",
      fontSize: "14px",
      boxShadow:
        "0 8px 30px rgba(0,0,0,.2)"
    }
  );


  document.body.appendChild(toast);


  setTimeout(
    () => toast.remove(),
    2200
  );

}


// =====================================
// NEW SEARCH
// =====================================

function resetSearch() {

  document
    .getElementById("nokp")
    .value = "";


  document
    .getElementById("pin")
    .value = "";


  document
    .getElementById("result")
    .classList.add("hidden");


  document
    .getElementById("message")
    .innerHTML = "";


  currentPassword = "";

  passwordVisible = false;


  document
    .getElementById("nokp")
    .focus();


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// =====================================
// TUTORIAL / HELP
// =====================================

function toggleSection(id) {

  const tutorial =
    document.getElementById("tutorial");

  const help =
    document.getElementById("help");

  const target =
    document.getElementById(id);


  if (id === "tutorial") {

    help.classList.add("hidden");

  } else {

    tutorial.classList.add("hidden");

  }


  target.classList.toggle("hidden");


  if (!target.classList.contains("hidden")) {

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


// =====================================
// ENTER KEY
// =====================================

document
  .getElementById("nokp")
  .addEventListener(
    "keydown",
    function(event) {

      if (event.key === "Enter") {

        document
          .getElementById("pin")
          .focus();

      }

    }
  );


document
  .getElementById("pin")
  .addEventListener(
    "keydown",
    function(event) {

      if (event.key === "Enter") {

        cariDelima();

      }

    }
  );


// =====================================
// ONLY NUMBERS
// =====================================

document
  .getElementById("nokp")
  .addEventListener(
    "input",
    function() {

      this.value =
        this.value
          .replace(/\D/g, "")
          .slice(0, 12);

    }
  );


document
  .getElementById("pin")
  .addEventListener(
    "input",
    function() {

      this.value =
        this.value
          .replace(/\D/g, "")
          .slice(0, 4);

    }
  );


// =====================================
// PWA INSTALL
// =====================================

const installCard =
  document.getElementById("installCard");

const installBtn =
  document.getElementById("installBtn");


window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredPrompt = event;

    installCard
      .classList
      .remove("hidden");

  }
);


installBtn.addEventListener(
  "click",
  async () => {

    // iPhone instructions

    if (
      isIOS() &&
      !deferredPrompt
    ) {

      alert(
        "Untuk memasang Portal DELIMa di iPhone:\n\n" +
        "1. Buka portal menggunakan Safari.\n" +
        "2. Tekan butang Share.\n" +
        "3. Pilih Add to Home Screen.\n" +
        "4. Tekan Add."
      );

      return;
    }


    if (!deferredPrompt) {
      return;
    }


    deferredPrompt.prompt();


    await deferredPrompt.userChoice;


    deferredPrompt = null;


    installCard
      .classList
      .add("hidden");

  }
);


window.addEventListener(
  "appinstalled",
  () => {

    deferredPrompt = null;

    installCard
      .classList
      .add("hidden");

  }
);


// =====================================
// IOS
// =====================================

function isIOS() {

  return /iphone|ipad|ipod/i
    .test(
      navigator.userAgent
    );

}


function isStandalone() {

  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    navigator.standalone === true
  );

}


if (
  isIOS() &&
  !isStandalone()
) {

  installCard
    .classList
    .remove("hidden");


  installBtn.textContent =
    "Cara Install";

}


// =====================================
// SECURITY
// =====================================

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    String(text);

  return div.innerHTML;

}
// =====================================
// LOAD PUBLIC CONTENT
// =====================================

async function loadPublicContent() {

  await Promise.all([
    loadPublicTutorials(),
    loadPublicHelp()
  ]);

}


// =====================================
// LOAD TUTORIAL
// =====================================

async function loadPublicTutorials() {

  const container =
    document.getElementById("tutorialContent");

  if (!container) return;

  try {

    const response =
      await fetch(
        API_URL +
        "?action=getTutorial&t=" +
        Date.now(),
        {
          cache: "no-store"
        }
      );

    const data =
      await response.json();


    if (
      !data.success ||
      !Array.isArray(data.tutorials)
    ) {

      throw new Error(
        "Tutorial API error"
      );

    }


    container.innerHTML = "";


    if (data.tutorials.length === 0) {

      container.innerHTML =
        '<div class="help-box">' +
        '<strong>Belum ada tutorial</strong>' +
        '<p>Tutorial akan ditambah dari semasa ke semasa.</p>' +
        '</div>';

      return;

    }


    data.tutorials.forEach(
      (tutorial, index) => {

        const item =
          document.createElement("div");

        item.className =
          "tutorial-item";


        const number =
          document.createElement("div");

        number.className =
          "number";

        number.textContent =
          tutorial.susunan ||
          index + 1;


        const content =
          document.createElement("div");


        const title =
          document.createElement("strong");

        title.textContent =
          tutorial.tajuk || "Tutorial";


        const description =
          document.createElement("p");

        description.textContent =
          tutorial.penerangan || "";


        content.appendChild(title);

        if (tutorial.penerangan) {
          content.appendChild(description);
        }


        // LINK

        const safeLink =
          safePublicUrl(
            tutorial.link
          );


        if (safeLink) {

          const link =
            document.createElement("a");

          link.href =
            safeLink;

          link.target =
            "_blank";

          link.rel =
            "noopener noreferrer";

          link.textContent =
            "Buka Tutorial ↗";

          link.style.display =
            "inline-block";

          link.style.marginTop =
            "8px";

          link.style.color =
            "#123b72";

          link.style.fontWeight =
            "700";

          link.style.textDecoration =
            "none";


          content.appendChild(link);

        }


        item.appendChild(number);

        item.appendChild(content);

        container.appendChild(item);

      }
    );


  } catch (error) {

    console.error(
      "Tutorial Error:",
      error
    );


    container.innerHTML =
      '<div class="help-box">' +
      '<strong>Tutorial tidak dapat dimuatkan.</strong>' +
      '<p>Sila cuba semula kemudian.</p>' +
      '</div>';

  }

}


// =====================================
// LOAD HELP
// =====================================

// =====================================
// LOAD HELP
// =====================================

async function loadPublicHelp() {

  const container =
    document.getElementById(
      "helpContent"
    );

  if (!container) {
    return;
  }


  // =====================================
  // CARI / CIPTA RUANG INFO DINAMIK
  // =====================================

  let dynamicContainer =
    document.getElementById(
      "publicHelpDynamic"
    );


  if (!dynamicContainer) {

    dynamicContainer =
      document.createElement("div");

    dynamicContainer.id =
      "publicHelpDynamic";


    /*
      Letakkan maklumat Google Sheet
      selepas FAQ.
    */

    const helpAnswer =
      document.getElementById(
        "helpAnswer"
      );


    if (helpAnswer) {

      helpAnswer.insertAdjacentElement(
        "afterend",
        dynamicContainer
      );

    } else {

      container.appendChild(
        dynamicContainer
      );

    }

  }


  try {

    const response =
      await fetch(
        API_URL +
        "?action=getHelp&t=" +
        Date.now(),
        {
          cache: "no-store"
        }
      );


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        "Help API error"
      );

    }


    const help =
      data.help || {};


    // =====================================
    // TITLE
    // =====================================

    const title =
      document.getElementById(
        "publicHelpTitle"
      );


    if (
      title &&
      help.tajuk
    ) {

      title.textContent =
        help.tajuk;

    }


    // =====================================
    // PENTING:
    // KOSONGKAN DYNAMIC SAHAJA
    // BUKAN helpContent
    // =====================================

    dynamicContainer.innerHTML = "";


    // =====================================
    // DESCRIPTION
    // =====================================

    if (help.penerangan) {

      const box =
        createHelpBox(
          "Maklumat Bantuan",
          help.penerangan
        );

      dynamicContainer.appendChild(
        box
      );

    }


    // =====================================
    // OFFICER
    // =====================================

    if (help.pegawai) {

      const box =
        createHelpBox(
          "Pegawai / Penyelaras",
          help.pegawai
        );

      dynamicContainer.appendChild(
        box
      );

    }


    // =====================================
    // TIME
    // =====================================

    if (help.waktu) {

      const box =
        createHelpBox(
          "Waktu Bantuan",
          help.waktu
        );

      dynamicContainer.appendChild(
        box
      );

    }


    // =====================================
    // CONTACT
    // =====================================

    const contact =
      document.createElement(
        "div"
      );


    contact.style.display =
      "grid";

    contact.style.gap =
      "10px";

    contact.style.marginTop =
      "15px";


    // =====================================
    // WHATSAPP
    // =====================================

    if (help.whatsapp) {

      const number =
        String(
          help.whatsapp
        ).replace(
          /\D/g,
          ""
        );


      const whatsapp =
        document.createElement(
          "a"
        );


      whatsapp.href =
        "https://wa.me/" +
        number;


      whatsapp.target =
        "_blank";


      whatsapp.rel =
        "noopener noreferrer";


      whatsapp.textContent =
        "💬 Hubungi melalui WhatsApp";


      styleContactButton(
        whatsapp,
        "#159455"
      );


      contact.appendChild(
        whatsapp
      );

    }


    // =====================================
    // EMAIL
    // =====================================

    if (help.email) {

      const email =
        document.createElement(
          "a"
        );


      email.href =
        "mailto:" +
        encodeURIComponent(
          help.email
        );


      email.textContent =
        "✉️ Hantar E-mel";


      styleContactButton(
        email,
        "#123b72"
      );


      contact.appendChild(
        email
      );

    }


    // =====================================
    // MASUKKAN CONTACT
    // =====================================

    if (
      contact.children.length > 0
    ) {

      dynamicContainer.appendChild(
        contact
      );

    }


    console.log(
      "✅ Bantuan ICT + FAQ berjaya dimuatkan"
    );


  } catch (error) {

    console.error(
      "Help Error:",
      error
    );


    /*
      Jangan padam FAQ jika API gagal.
      Hanya paparkan error dalam
      bahagian dynamic.
    */

    dynamicContainer.innerHTML =
      '<div class="help-box">' +
      '<strong>Maklumat bantuan tidak dapat dimuatkan.</strong>' +
      '<p>Sila cuba semula kemudian.</p>' +
      '</div>';

  }

}

// =====================================
// CREATE HELP BOX
// =====================================

function createHelpBox(
  title,
  text
) {

  const box =
    document.createElement("div");


  box.className =
    "help-box";


  const heading =
    document.createElement("strong");


  heading.textContent =
    title;


  const paragraph =
    document.createElement("p");


  paragraph.textContent =
    text;


  box.appendChild(
    heading
  );


  box.appendChild(
    paragraph
  );


  return box;

}


// =====================================
// CONTACT BUTTON
// =====================================

function styleContactButton(
  element,
  background
) {

  element.style.display =
    "block";

  element.style.padding =
    "13px";

  element.style.borderRadius =
    "10px";

  element.style.background =
    background;

  element.style.color =
    "#ffffff";

  element.style.textAlign =
    "center";

  element.style.textDecoration =
    "none";

  element.style.fontWeight =
    "700";

}


// =====================================
// SAFE PUBLIC URL
// =====================================

function safePublicUrl(value) {

  if (!value) return "";


  try {

    const url =
      new URL(value);


    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {

      return "";

    }


    return url.href;


  } catch {

    return "";

  }

}


// =====================================
// START PUBLIC CONTENT
// =====================================

window.addEventListener(
  "DOMContentLoaded",
  loadPublicContent
);

// =====================================
// QUICK ACCESS
// =====================================

function goToSearch() {

  const searchCard =
    document.querySelector(
      ".search-card"
    );

  if (!searchCard) {
    return;
  }

  searchCard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setTimeout(() => {

    const firstInput =
      searchCard.querySelector(
        "input"
      );

    if (firstInput) {
      firstInput.focus();
    }

  }, 500);

}


// =====================================
// QUICK TUTORIAL
// =====================================

function openQuickTutorial() {

  const tutorial =
    document.getElementById(
      "tutorial"
    );

  if (!tutorial) {
    return;
  }

  tutorial.classList.remove(
    "hidden"
  );

  tutorial.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================
// QUICK HELP
// =====================================

function openQuickHelp() {

  const help =
    document.getElementById(
      "help"
    );

  if (!help) {
    return;
  }

  help.classList.remove(
    "hidden"
  );

  help.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}
// =====================================
// SERVICE WORKER
// =====================================

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("./service-worker.js", {
        scope: "./"
      })
      .then(registration => {
        console.log(
          "Service Worker aktif:",
          registration.scope
        );
      })
      .catch(error => {
        console.error(
          "Service Worker gagal:",
          error
        );
      });

  });

}
// ======================================================
// CHAT PANEL - LIVE CHAT SAHAJA
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const btn =
      document.getElementById("chatButton");

    const panel =
      document.getElementById("chatPanel");

    const closeBtn =
      document.getElementById("closeChat");

    const badge =
      document.querySelector(".chat-badge");

    const liveArea =
      document.getElementById("liveChatArea");


    if (!btn || !panel) {

      console.error(
        "Chat ICT: button/panel tidak dijumpai"
      );

      return;
    }


    console.log(
      "✅ Live Chat ICT aktif"
    );


    // ==========================================
    // BUKA CHAT
    // ==========================================

    btn.onclick =
      function (event) {

        event.preventDefault();
        event.stopPropagation();


        panel.classList.add(
          "active"
        );

        panel.setAttribute(
          "aria-hidden",
          "false"
        );


        // Live Chat terus dipaparkan
        if (liveArea) {

          liveArea.classList.remove(
            "hidden"
          );

        }


        // Hilangkan badge
        if (badge) {

          badge.style.display =
            "none";

        }


        // Jika sudah ada conversation,
        // scroll ke mesej
        setTimeout(
          function () {

            if (liveArea) {

              liveArea.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
              });

            }

          },
          100
        );

      };


    // ==========================================
    // TUTUP CHAT
    // ==========================================

    if (closeBtn) {

      closeBtn.onclick =
        function (event) {

          event.preventDefault();
          event.stopPropagation();


          panel.classList.remove(
            "active"
          );

          panel.setAttribute(
            "aria-hidden",
            "true"
          );

        };

    }


    // ==========================================
    // ESC = TUTUP CHAT
    // ==========================================

    document.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Escape") {

          panel.classList.remove(
            "active"
          );

          panel.setAttribute(
            "aria-hidden",
            "true"
          );

        }

      }
    );

  }
);

// ======================================================
// FAQ - BANTUAN ICT
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const answerBox =
      document.getElementById(
        "helpAnswer"
      );


    const buttons =
      document.querySelectorAll(
        ".ict-help-options [data-help]"
      );


    if (!buttons.length) {

      console.log(
        "ℹ️ Tiada butang FAQ dijumpai"
      );

      return;
    }


    console.log(
      "✅ FAQ Bantuan ICT aktif"
    );


    buttons.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const type =
              button.getAttribute(
                "data-help"
              );


            let answer = "";


            // ======================================
            // LUPA PASSWORD
            // ======================================

            if (type === "password") {

              answer = `
                🔑
                <strong>
                  Lupa Kata Laluan
                </strong>

                <br><br>

                Gunakan menu
                <strong>Semak ID</strong>.

                Masukkan No. KP / MyKid murid
                dan PIN penjaga untuk melihat
                ID DELIMa dan kata laluan.
              `;

            }


            // ======================================
            // MASALAH ID
            // ======================================

            else if (type === "id") {

              answer = `
                👤
                <strong>
                  Masalah ID DELIMa
                </strong>

                <br><br>

                Pastikan No. KP / MyKid murid
                dimasukkan dengan betul.

                Jika akaun masih tidak ditemui,
                sila hubungi Admin ICT melalui
                Live Chat.
              `;

            }


            // ======================================
            // LOGIN
            // ======================================

            else if (type === "login") {

              answer = `
                🔐
                <strong>
                  Tidak Boleh Log Masuk
                </strong>

                <br><br>

                Pastikan ID DELIMa dan
                kata laluan dimasukkan dengan tepat.

                Pastikan juga tiada ruang kosong
                semasa menyalin ID atau kata laluan.
              `;

            }


            // ======================================
            // GOOGLE CLASSROOM
            // ======================================

            else if (type === "classroom") {

              answer = `
                📚
                <strong>
                  Google Classroom
                </strong>

                <br><br>

                Sila buka bahagian
                <strong>Tutorial DELIMa</strong>
                untuk melihat panduan penggunaan
                Google Classroom.
              `;

            }


            // ======================================
            // MASALAH LAIN
            // ======================================

            else {

              answer = `
                ❓
                <strong>
                  Masalah Lain
                </strong>

                <br><br>

                Jika masalah anda tidak disenaraikan,
                sila gunakan
                <strong>Chat dengan Admin ICT</strong>
                untuk mendapatkan bantuan lanjut.
              `;

            }


            // ======================================
            // PAPAR JAWAPAN
            // ======================================

            if (answerBox) {

              answerBox.innerHTML = `
                <div class="chat-answer-bubble">
                  ${answer}
                </div>
              `;


              answerBox.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
              });

            }

          }
        );

      }
    );

  }
);

// ======================================================
// LIVE CHAT PARENT
// ======================================================

const LIVE_CHAT_API =
  "https://script.google.com/macros/s/AKfycbzWvfXVDh6y2ttNc3ySkVcymqEfgmsI7K-wwGY4ve_m_y78HfVIi55k7kyzllgGVnB4/exec";

let liveChatId = "";
let liveChatSessionId = "";
let liveChatTimer = null;


// ------------------------------------------------------
// ELEMENTS
// ------------------------------------------------------


const liveChatArea =
  document.getElementById("liveChatArea");

const chatLogin =
  document.getElementById("chatLogin");

const chatConversation =
  document.getElementById("chatConversation");

const chatLoginBtn =
  document.getElementById("chatLoginBtn");

const chatNokp =
  document.getElementById("chatNokp");

const chatPin =
  document.getElementById("chatPin");

const chatLoginMessage =
  document.getElementById("chatLoginMessage");

const chatStudentName =
  document.getElementById("chatStudentName");

const chatStudentClass =
  document.getElementById("chatStudentClass");

const liveMessages =
  document.getElementById("liveMessages");

const liveMessageInput =
  document.getElementById("liveMessageInput");

const sendLiveMessageBtn =
  document.getElementById("sendLiveMessageBtn");




// ------------------------------------------------------
// LOGIN / VERIFY PARENT
// ------------------------------------------------------

if (chatLoginBtn) {

  chatLoginBtn.addEventListener(
    "click",
    async function () {

      const nokp =
        String(chatNokp?.value || "")
          .replace(/\D/g, "");

      const pin =
        String(chatPin?.value || "")
          .replace(/\D/g, "");


      if (
        nokp.length !== 12 ||
        pin.length !== 4
      ) {

        showChatLoginMessage(
          "Sila masukkan No. KP/MyKid dan PIN yang betul.",
          false
        );

        return;
      }


      chatLoginBtn.disabled = true;
      chatLoginBtn.textContent =
        "Mengesahkan...";


      try {

        const url =
          LIVE_CHAT_API +
          "?action=startChat" +
          "&nokp=" +
          encodeURIComponent(nokp) +
          "&pin=" +
          encodeURIComponent(pin) +
          "&_=" +
          Date.now();


        const response =
          await fetch(url);


        const data =
          await response.json();


        if (!data.success) {

          showChatLoginMessage(
            data.message ||
            "Pengesahan gagal.",
            false
          );

          return;
        }


        liveChatId =
          data.chatId;

        liveChatSessionId =
          data.sessionId;

       window.delimaLiveChat = {
  chatId: liveChatId,
  sessionId: liveChatSessionId
};

console.log(
  "✅ delimaLiveChat SET:",
  window.delimaLiveChat
);
        

        // Simpan sesi dalam browser
        localStorage.setItem(
          "delima_chat_id",
          liveChatId
        );
        
        localStorage.setItem(
          "delima_chat_session",
          liveChatSessionId
        );


        if (chatStudentName) {

          chatStudentName.textContent =
            data.student?.nama ||
            "Murid";

        }


        if (chatStudentClass) {

          chatStudentClass.textContent =
            data.student?.kelas || "";

        }


        chatLogin.classList.add(
          "hidden"
        );

        chatConversation.classList.remove(
          "hidden"
        );
        
        // PAPAR NOTIFICATION SELEPAS CHAT SAH
        
        const notificationBox =
          document.getElementById(
            "parentNotificationBox"
          );
        
        if (notificationBox) {
        
          notificationBox.classList.remove(
            "hidden"
          );
        
        }

        // kosongkan PIN selepas berjaya
        if (chatPin) {
          chatPin.value = "";
        }


        await loadLiveMessages();


        // Semak balasan admin setiap 5 saat
        startLiveChatPolling();


        if (liveMessageInput) {
          liveMessageInput.focus();
        }


      } catch (error) {

        console.error(
          "Live Chat login error:",
          error
        );

        showChatLoginMessage(
          "Tidak dapat menghubungi sistem chat. Cuba semula.",
          false
        );


      } finally {

        chatLoginBtn.disabled = false;

        chatLoginBtn.textContent =
          "Mula Chat";

      }

    }
  );

}


// ------------------------------------------------------
// HANTAR MESEJ
// ------------------------------------------------------

if (sendLiveMessageBtn) {

  sendLiveMessageBtn.addEventListener(
    "click",
    sendLiveMessage
  );

}


if (liveMessageInput) {

  liveMessageInput.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendLiveMessage();

      }

    }
  );

}


async function sendLiveMessage() {

  if (
    !liveChatId ||
    !liveChatSessionId
  ) {

    return;
  }


  const message =
    String(
      liveMessageInput?.value || ""
    ).trim();


  if (!message) {
    return;
  }


  if (message.length > 1000) {
    alert("Mesej terlalu panjang.");
    return;
  }


  sendLiveMessageBtn.disabled = true;


  try {

    const url =
      LIVE_CHAT_API +
      "?action=sendChatMessage" +
      "&chatId=" +
      encodeURIComponent(
        liveChatId
      ) +
      "&sessionId=" +
      encodeURIComponent(
        liveChatSessionId
      ) +
      "&message=" +
      encodeURIComponent(
        message
      ) +
      "&_=" +
      Date.now();


    const response =
      await fetch(url);


    const data =
      await response.json();


    if (!data.success) {

      if (data.expired) {

        handleChatExpired();

        return;

      }


      alert(
        data.message ||
        "Mesej gagal dihantar."
      );

      return;

    }


    liveMessageInput.value = "";


    await loadLiveMessages();


  } catch (error) {

    console.error(
      "Send chat error:",
      error
    );

    alert(
      "Tidak dapat menghantar mesej."
    );


  } finally {

    sendLiveMessageBtn.disabled =
      false;

    if (liveMessageInput) {
      liveMessageInput.focus();
    }

  }

}


// ------------------------------------------------------
// LOAD MESEJ
// ------------------------------------------------------

async function loadLiveMessages() {

  if (
    !liveChatId ||
    !liveChatSessionId
  ) {

    return;
  }


  try {

    const url =
      LIVE_CHAT_API +
      "?action=getChatMessages" +
      "&chatId=" +
      encodeURIComponent(
        liveChatId
      ) +
      "&sessionId=" +
      encodeURIComponent(
        liveChatSessionId
      ) +
      "&_=" +
      Date.now();


    const response =
      await fetch(url);


    const data =
      await response.json();


    if (!data.success) {

      if (data.expired) {
        handleChatExpired();
      }

      return;
    }


    renderLiveMessages(
      data.messages || []
    );


  } catch (error) {

    console.error(
      "Load chat error:",
      error
    );

  }

}


// ------------------------------------------------------
// PAPAR MESEJ
// ------------------------------------------------------

function renderLiveMessages(messages) {

  if (!liveMessages) return;


  if (!messages.length) {

    liveMessages.innerHTML = `
      <div
        style="
          text-align:center;
          color:#98a2b3;
          font-size:10px;
          padding:25px 10px;
        ">
        👋 Perbualan telah dibuka.<br>
        Taip mesej untuk menghubungi Admin ICT.
      </div>
    `;

    return;
  }


  liveMessages.innerHTML =
    messages
      .map(item => {

        const sender =
          item.sender === "ADMIN"
            ? "admin"
            : "parent";


        const senderName =
          item.sender === "ADMIN"
            ? "Admin ICT"
            : "Anda";


        const time =
          formatLiveChatTime(
            item.timestamp
          );


        return `
          <div class="live-message ${sender}">
            <strong>
              ${senderName}
            </strong>

            <div>
              ${escapeLiveChatHTML(
                item.message
              )}
            </div>

            <span class="live-message-time">
              ${time}
            </span>
          </div>
        `;

      })
      .join("");


  liveMessages.scrollTop =
    liveMessages.scrollHeight;

}


// ------------------------------------------------------
// AUTO REFRESH
// ------------------------------------------------------

function startLiveChatPolling() {

  if (liveChatTimer) {
    clearInterval(liveChatTimer);
  }


  liveChatTimer =
    setInterval(
      loadLiveMessages,
      5000
    );

}


// ------------------------------------------------------
// SESSION EXPIRED
// ------------------------------------------------------

function handleChatExpired() {

  if (liveChatTimer) {

    clearInterval(
      liveChatTimer
    );

    liveChatTimer = null;

  }


  liveChatId = "";
  liveChatSessionId = "";

  const notificationBox =
  document.getElementById(
    "parentNotificationBox"
  );

if (notificationBox) {

  notificationBox.classList.add(
    "hidden"
  );

}

  localStorage.removeItem(
  "delima_chat_id"
);

localStorage.removeItem(
  "delima_chat_session"
);


  if (chatConversation) {

    chatConversation.classList.add(
      "hidden"
    );

  }


  if (chatLogin) {

    chatLogin.classList.remove(
      "hidden"
    );

  }


  showChatLoginMessage(
    "Sesi chat telah tamat. Sila sahkan semula maklumat murid.",
    false
  );

}


// ------------------------------------------------------
// MESSAGE LOGIN
// ------------------------------------------------------

function showChatLoginMessage(
  message,
  success
) {

  if (!chatLoginMessage) return;


  chatLoginMessage.textContent =
    message;


  chatLoginMessage.style.color =
    success
      ? "#16803c"
      : "#b42318";

}


// ------------------------------------------------------
// FORMAT TIME
// ------------------------------------------------------

function formatLiveChatTime(value) {

  if (!value) return "";


  try {

    return new Date(value)
      .toLocaleTimeString(
        "ms-MY",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


  } catch {

    return "";

  }

}


// ------------------------------------------------------
// SECURITY - ESCAPE MESSAGE
// ------------------------------------------------------

function escapeLiveChatHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

// ======================================================
// AUTO OPEN CHAT FROM PUSH NOTIFICATION
// ======================================================

async function openChatFromNotification() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const shouldOpen =
    params.get("openChat") === "1";


  console.log(
    "🔔 openChat parameter:",
    params.get("openChat")
  );


  if (!shouldOpen) {
    return;
  }


  console.log(
    "🔔 Auto opening Parent Live Chat..."
  );


  // ====================================================
  // 1. BUKA PANEL CHAT UTAMA
  // ====================================================

  const panel =
    document.getElementById(
      "chatPanel"
    );

  const badge =
    document.querySelector(
      ".chat-badge"
    );


  if (panel) {

    panel.classList.add(
      "active"
    );

    panel.setAttribute(
      "aria-hidden",
      "false"
    );

    console.log(
      "✅ chatPanel opened"
    );

  } else {

    console.error(
      "❌ chatPanel tidak dijumpai"
    );

  }


  if (badge) {
    badge.style.display = "none";
  }


  // ====================================================
  // 2. BUKA LIVE CHAT AREA
  // ====================================================

  if (liveChatArea) {

    liveChatArea.classList.remove(
      "hidden"
    );

    console.log(
      "✅ liveChatArea opened"
    );

  }


 


  // ====================================================
  // 3. RESTORE CHAT SESSION
  // ====================================================

  const savedChatId =
  localStorage.getItem(
    "delima_chat_id"
  );

const savedSessionId =
  localStorage.getItem(
    "delima_chat_session"
  );


  console.log(
    "🔎 Saved chat:",
    !!savedChatId,
    !!savedSessionId
  );


  if (
    savedChatId &&
    savedSessionId
  ) {

    liveChatId =
      savedChatId;

    liveChatSessionId =
      savedSessionId;


    window.delimaLiveChat = {

      chatId:
        liveChatId,

      sessionId:
        liveChatSessionId

    };


    // ================================================
    // SEMBUNYIKAN LOGIN
    // ================================================

    if (chatLogin) {

      chatLogin.classList.add(
        "hidden"
      );

    }


    // ================================================
    // PAPAR CONVERSATION
    // ================================================

    if (chatConversation) {

      chatConversation.classList.remove(
        "hidden"
      );

    }


    // ================================================
    // PAPAR NOTIFICATION BOX
    // ================================================

    const notificationBox =
      document.getElementById(
        "parentNotificationBox"
      );


    if (notificationBox) {

      notificationBox.classList.remove(
        "hidden"
      );

    }


    // ================================================
    // LOAD MESSAGE
    // ================================================

    await loadLiveMessages();

    startLiveChatPolling();


    console.log(
      "✅ Parent chat session restored"
    );

  } else {

    /*
      Tiada session.

      Panel masih dibuka tetapi Parent
      perlu sahkan No KP + PIN.
    */

    if (chatLogin) {

      chatLogin.classList.remove(
        "hidden"
      );

    }


    if (chatConversation) {

      chatConversation.classList.add(
        "hidden"
      );

    }


    console.log(
      "ℹ️ Tiada session chat tersimpan"
    );

  }


  // ====================================================
  // 4. SCROLL KE CHAT
  // ====================================================

  setTimeout(
    function () {

      if (liveChatArea) {

        liveChatArea.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });

      }

    },
    200
  );


  // ====================================================
  // 5. BERSIHKAN URL
  // ====================================================

  setTimeout(
    function () {

      const cleanUrl =
        window.location.pathname;

      window.history.replaceState(
        {},
        document.title,
        cleanUrl
      );

    },
    1000
  );

}


// ======================================================
// RUN
// ======================================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    openChatFromNotification
  );

} else {

  openChatFromNotification();

}
