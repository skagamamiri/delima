const API_URL =
"https://script.google.com/macros/s/AKfycbzWvfXVDh6y2ttNc3ySkVcymqEfgmsI7K-wwGY4ve_m_y78HfVIi55k7kyzllgGVnB4/exec";


let sessionToken = "";
let allStudents = [];
let allTutorials = [];

// ======================================
// LIVE CHAT 
// ======================================

let adminChatConversations = [];
let activeAdminChatId = "";
let adminChatTimer = null;

// ======================================
// PERMOHONAN BANTUAN ICT
// ======================================
let adminICTRequests = [];
let activeICTRequestId = "";
let activeICTFilter = "ALL";
let adminICTTimer = null;

// ======================================
// LOGIN
// ======================================

async function adminLogin() {

  const username =
    document
      .getElementById("username")
      .value
      .trim();

  const password =
    document
      .getElementById("adminPassword")
      .value;

  const button =
    document
      .getElementById("loginBtn");


  document
    .getElementById("loginMessage")
    .innerHTML = "";


  if (!username || !password) {

    showLoginError(
      "Masukkan username dan kata laluan."
    );

    return;
  }


  button.disabled = true;

  button.textContent =
    "Sedang log masuk...";


  try {

    const data =
      await apiRequest(
        "adminLogin",
        {
          username,
          password
        },
        false
      );


    if (!data.success) {

      showLoginError(
        data.message ||
        "Login tidak berjaya."
      );

      return;
    }


    sessionToken =
      data.token;


    sessionStorage.setItem(
      "delimaAdminToken",
      sessionToken
    );


    showDashboard();


  } catch (error) {

    console.error(error);

    showLoginError(
      "Tidak dapat menghubungi sistem."
    );


  } finally {

    button.disabled = false;

    button.textContent =
      "Log Masuk";

  }

}


// ======================================
// DASHBOARD
// ======================================

function showDashboard() {

  document
    .getElementById("loginPage")
    .classList
    .add("hidden");


  document
    .getElementById("dashboardPage")
    .classList
    .remove("hidden");


  showAdminSection("students");

}


// ======================================
// ADMIN NAVIGATION
// ======================================

function showAdminSection(section) {

  // ID tab tidak boleh dibina secara automatik kerana
  // "ictRequests" menggunakan id tabICTRequests (ICT huruf besar).
  const sectionConfig = {
    students: { sectionId: "studentsSection", tabId: "tabStudents" },
    tutorial: { sectionId: "tutorialSection", tabId: "tabTutorial" },
    help: { sectionId: "helpSection", tabId: "tabHelp" },
    ictRequests: { sectionId: "ictRequestsSection", tabId: "tabICTRequests" },
    chat: { sectionId: "chatSection", tabId: "tabChat" }
  };

  Object.values(sectionConfig).forEach(function (cfg) {
    const sectionEl = document.getElementById(cfg.sectionId);
    const tabEl = document.getElementById(cfg.tabId);

    if (sectionEl) sectionEl.classList.add("hidden");
    if (tabEl) tabEl.classList.remove("active");
  });

  const selected = sectionConfig[section];
  if (!selected) {
    console.error("Admin section tidak dikenali:", section);
    return;
  }

  const selectedSection = document.getElementById(selected.sectionId);
  const selectedTab = document.getElementById(selected.tabId);

  if (selectedSection) selectedSection.classList.remove("hidden");
  if (selectedTab) selectedTab.classList.add("active");


  if (section === "students") {
    loadDashboard();
  }


  if (section === "tutorial") {
    loadTutorials();
  }


  if (section === "help") {
    loadHelp();
  }
  
 if (section === "ictRequests") {
  loadAdminICTRequests();
  startAdminICTPolling();
} else {
  stopAdminICTPolling();
}

 if (section === "chat") {

  loadAdminChats();

  startAdminChatPolling();

} else {

  stopAdminChatPolling();

}
  
}


// ======================================
// STUDENTS
// ======================================

async function loadDashboard() {

  const loading =
    document
      .getElementById("loadingStudents");


  loading.classList.remove("hidden");


  try {

    const data =
      await apiRequest(
        "adminData"
      );


    if (!data.success) {

      handleApiFailure(data);

      return;
    }


    allStudents =
      Array.isArray(data.students)
        ? data.students
        : [];


    updateStats(
      data.stats || {}
    );


    populateClasses();

    renderStudents();


  } catch (error) {

    console.error(error);

    alert(
      "Tidak dapat memuatkan data murid."
    );


  } finally {

    loading.classList.add("hidden");

  }

}


// ======================================
// STATISTICS
// ======================================

function updateStats(stats) {

  document
    .getElementById("totalStudents")
    .textContent =
      stats.totalStudents ?? 0;


  document
    .getElementById("totalClasses")
    .textContent =
      stats.totalClasses ?? 0;


  document
    .getElementById("totalAccounts")
    .textContent =
      stats.totalAccounts ?? 0;


  document
    .getElementById("missingPin")
    .textContent =
      stats.missingPin ?? 0;

}


// ======================================
// CLASS FILTER
// ======================================

function populateClasses() {

  const select =
    document
      .getElementById("classFilter");


  const classes =
    [
      ...new Set(
        allStudents
          .map(s => s.kelas)
          .filter(Boolean)
      )
    ].sort();


  select.innerHTML =
    '<option value="">Semua Kelas</option>';


  classes.forEach(kelas => {

    const option =
      document.createElement("option");


    option.value = kelas;

    option.textContent = kelas;


    select.appendChild(option);

  });

}


// ======================================
// STUDENT TABLE
// ======================================

function renderStudents() {

  const tbody =
    document
      .getElementById("studentTable");


  const query =
    document
      .getElementById("studentSearch")
      .value
      .trim()
      .toLowerCase();


  const selectedClass =
    document
      .getElementById("classFilter")
      .value;


  const filtered =
    allStudents.filter(student => {


      const searchMatch =

        !query ||

        String(student.nama || "")
          .toLowerCase()
          .includes(query) ||

        String(student.nokp || "")
          .includes(query) ||

        String(student.delima || "")
          .toLowerCase()
          .includes(query);


      const classMatch =

        !selectedClass ||

        student.kelas ===
          selectedClass;


      return (
        searchMatch &&
        classMatch
      );

    });


  tbody.innerHTML = "";


  if (!filtered.length) {

    tbody.innerHTML =
      '<tr>' +
      '<td colspan="5">' +
      'Tiada rekod dijumpai.' +
      '</td>' +
      '</tr>';

    return;
  }


  filtered.forEach(student => {

    const tr =
      document.createElement("tr");


    tr.innerHTML =

      "<td>" +
      escapeHTML(student.nama || "-") +
      "</td>" +

      "<td>" +
      escapeHTML(student.nokp || "-") +
      "</td>" +

      "<td>" +
      escapeHTML(student.kelas || "-") +
      "</td>" +

      "<td>" +
      escapeHTML(student.delima || "-") +
      "</td>" +

      '<td><span class="pin">' +
      escapeHTML(student.pin || "-") +
      "</span></td>";


    tbody.appendChild(tr);

  });

}


// ======================================
// TUTORIAL
// ======================================

async function loadTutorials() {

  const loading =
    document
      .getElementById("tutorialLoading");


  loading.classList.remove("hidden");


  try {

    const data =
      await apiRequest(
        "adminTutorial"
      );


    if (!data.success) {

      handleApiFailure(data);

      return;
    }


    allTutorials =
      Array.isArray(data.tutorials)
        ? data.tutorials
        : [];


    allTutorials.sort(
      (a,b) =>
        Number(a.susunan || 999) -
        Number(b.susunan || 999)
    );


    renderTutorials();


  } catch (error) {

    console.error(error);

    alert(
      "Tidak dapat memuatkan tutorial."
    );


  } finally {

    loading.classList.add("hidden");

  }

}


// ======================================
// RENDER TUTORIAL
// ======================================

function renderTutorials() {

  const container =
    document
      .getElementById("tutorialList");


  container.innerHTML = "";


  if (!allTutorials.length) {

    container.innerHTML =
      "<p>Belum ada tutorial.</p>";

    return;
  }


  allTutorials.forEach(
    (tutorial, index) => {


      const card =
        document.createElement("div");


      card.className =
        "tutorial-card";


      const active =
        String(tutorial.status)
          .toUpperCase() === "AKTIF";


      const safeLink =
        safeHttpUrl(
          tutorial.link
        );


      card.innerHTML =

        '<div class="tutorial-number">' +
        escapeHTML(
          tutorial.susunan ||
          index + 1
        ) +
        '</div>' +


        '<div class="tutorial-content">' +

        "<h3>" +
        escapeHTML(tutorial.tajuk) +
        "</h3>" +

        "<p>" +
        escapeHTML(
          tutorial.penerangan || ""
        ) +
        "</p>" +


        (
          safeLink
          ?
          '<a class="tutorial-link" ' +
          'href="' +
          escapeHTML(safeLink) +
          '" target="_blank" ' +
          'rel="noopener noreferrer">' +
          'Buka Tutorial ↗</a>'
          :
          ""
        ) +


        '<br><span class="status ' +
        (
          active
            ? "status-active"
            : "status-inactive"
        ) +
        '">' +

        (
          active
            ? "AKTIF"
            : "TIDAK AKTIF"
        ) +

        "</span>" +

        "</div>" +


        '<div class="tutorial-actions">' +

        '<button class="edit-btn">' +
        'Edit</button>' +

        '<button class="delete-btn">' +
        'Padam</button>' +

        "</div>";


      const buttons =
        card.querySelectorAll(
          "button"
        );


      buttons[0].onclick =
        () =>
          editTutorial(
            tutorial.id
          );


      buttons[1].onclick =
        () =>
          deleteTutorial(
            tutorial.id,
            tutorial.tajuk
          );


      container.appendChild(card);

    }
  );

}


// ======================================
// OPEN TUTORIAL FORM
// ======================================

function openTutorialForm() {

  document
    .getElementById("tutorialFormTitle")
    .textContent =
      "Tambah Tutorial";


  document
    .getElementById("tutorialId")
    .value = "";


  document
    .getElementById("tutorialTitle")
    .value = "";


  document
    .getElementById("tutorialDescription")
    .value = "";


  document
    .getElementById("tutorialLink")
    .value = "";


  document
    .getElementById("tutorialStatus")
    .value = "AKTIF";


  document
    .getElementById("tutorialOrder")
    .value =
      allTutorials.length + 1;


  document
    .getElementById("tutorialFormMessage")
    .innerHTML = "";


  document
    .getElementById("tutorialModal")
    .classList
    .remove("hidden");

}


// ======================================
// EDIT TUTORIAL
// ======================================

function editTutorial(id) {

  const tutorial =
    allTutorials.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!tutorial) {
    return;
  }


  document
    .getElementById("tutorialFormTitle")
    .textContent =
      "Edit Tutorial";


  document
    .getElementById("tutorialId")
    .value =
      tutorial.id;


  document
    .getElementById("tutorialTitle")
    .value =
      tutorial.tajuk || "";


  document
    .getElementById("tutorialDescription")
    .value =
      tutorial.penerangan || "";


  document
    .getElementById("tutorialLink")
    .value =
      tutorial.link || "";


  document
    .getElementById("tutorialStatus")
    .value =
      tutorial.status || "AKTIF";


  document
    .getElementById("tutorialOrder")
    .value =
      tutorial.susunan || 1;


  document
    .getElementById("tutorialFormMessage")
    .innerHTML = "";


  document
    .getElementById("tutorialModal")
    .classList
    .remove("hidden");

}


// ======================================
// CLOSE FORM
// ======================================

function closeTutorialForm() {

  document
    .getElementById("tutorialModal")
    .classList
    .add("hidden");

}


// ======================================
// SAVE TUTORIAL
// ======================================

async function saveTutorial() {

  const id =
    document
      .getElementById("tutorialId")
      .value;


  const tajuk =
    document
      .getElementById("tutorialTitle")
      .value
      .trim();


  const penerangan =
    document
      .getElementById("tutorialDescription")
      .value
      .trim();


  const link =
    document
      .getElementById("tutorialLink")
      .value
      .trim();


  const status =
    document
      .getElementById("tutorialStatus")
      .value;


  const susunan =
    document
      .getElementById("tutorialOrder")
      .value;


  if (!tajuk) {

    showTutorialFormError(
      "Masukkan tajuk tutorial."
    );

    return;
  }


  if (
    link &&
    !safeHttpUrl(link)
  ) {

    showTutorialFormError(
      "Link tutorial mesti bermula dengan http:// atau https://."
    );

    return;
  }


  const button =
    document
      .getElementById("saveTutorialBtn");


  button.disabled = true;

  button.textContent =
    "Menyimpan...";


  try {

    const data =
      await apiRequest(
        "saveTutorial",
        {
          id,
          tajuk,
          penerangan,
          link,
          status,
          susunan
        }
      );


    if (!data.success) {

      handleApiFailure(data);

      showTutorialFormError(
        data.message ||
        "Tidak dapat menyimpan tutorial."
      );

      return;
    }


    closeTutorialForm();

    await loadTutorials();


  } catch (error) {

    console.error(error);

    showTutorialFormError(
      "Tidak dapat menghubungi sistem."
    );


  } finally {

    button.disabled = false;

    button.textContent =
      "Simpan Tutorial";

  }

}


// ======================================
// DELETE TUTORIAL
// ======================================

async function deleteTutorial(
  id,
  title
) {

  const confirmed =
    confirm(
      'Padam tutorial "' +
      title +
      '"?'
    );


  if (!confirmed) {
    return;
  }


  try {

    const data =
      await apiRequest(
        "deleteTutorial",
        { id }
      );


    if (!data.success) {

      handleApiFailure(data);

      alert(
        data.message ||
        "Tidak dapat memadam tutorial."
      );

      return;
    }


    await loadTutorials();


  } catch (error) {

    console.error(error);

    alert(
      "Tidak dapat menghubungi sistem."
    );

  }

}


// ======================================
// HELP
// ======================================

async function loadHelp() {

  try {

    const data =
      await apiRequest(
        "getAdminHelp"
      );


    if (!data.success) {

      handleApiFailure(data);

      return;
    }


    const help =
      data.help || {};


    document
      .getElementById("helpTitle")
      .value =
        help.tajuk || "";


    document
      .getElementById("helpDescription")
      .value =
        help.penerangan || "";


    document
      .getElementById("helpOfficer")
      .value =
        help.pegawai || "";


    document
      .getElementById("helpWhatsapp")
      .value =
        help.whatsapp || "";


    document
      .getElementById("helpEmail")
      .value =
        help.email || "";


    document
      .getElementById("helpTime")
      .value =
        help.waktu || "";


  } catch (error) {

    console.error(error);

    alert(
      "Tidak dapat memuatkan Bantuan ICT."
    );

  }

}


// ======================================
// SAVE HELP
// ======================================

async function saveHelp() {

  const button =
    document
      .getElementById("saveHelpBtn");


  const message =
    document
      .getElementById("helpMessage");


  message.innerHTML = "";


  const values = {

    tajuk:
      document
        .getElementById("helpTitle")
        .value
        .trim(),

    penerangan:
      document
        .getElementById("helpDescription")
        .value
        .trim(),

    pegawai:
      document
        .getElementById("helpOfficer")
        .value
        .trim(),

    whatsapp:
      document
        .getElementById("helpWhatsapp")
        .value
        .replace(/\D/g, ""),

    email:
      document
        .getElementById("helpEmail")
        .value
        .trim(),

    waktu:
      document
        .getElementById("helpTime")
        .value
        .trim()

  };


  button.disabled = true;

  button.textContent =
    "Menyimpan...";


  try {

    const data =
      await apiRequest(
        "saveHelp",
        values
      );


    if (!data.success) {

      handleApiFailure(data);

      throw new Error(
        data.message ||
        "Save failed"
      );

    }


    message.innerHTML =
      '<div class="success-message">' +
      '✓ Maklumat Bantuan ICT berjaya disimpan.' +
      '</div>';


  } catch (error) {

    console.error(error);

    message.innerHTML =
      '<div class="error">' +
      'Tidak dapat menyimpan maklumat.' +
      '</div>';


  } finally {

    button.disabled = false;

    button.textContent =
      "Simpan Maklumat Bantuan";

  }

}

// ======================================
// PERMOHONAN BANTUAN ICT - LOAD
// ======================================

async function loadAdminICTRequests(showLoading = false) {
  const list = document.getElementById("ictRequestList");
  const count = document.getElementById("ictRequestCount");
  const message = document.getElementById("ictRequestMessage");
  if (!list) return;
  if (showLoading || !adminICTRequests.length) list.innerHTML = '<div class="ict-empty">Sedang memuatkan permohonan...</div>';

  try {
    const data = await apiRequest("getAdminICTRequests");
    if (!data.success) {
      handleApiFailure(data);
      list.innerHTML = '<div class="ict-empty">' + escapeHTML(data.message || "Tidak dapat memuatkan permohonan.") + '</div>';
      return;
    }
    adminICTRequests = Array.isArray(data.requests) ? data.requests : [];
    if (count) count.textContent = adminICTRequests.length;
    updateICTRequestBadge();
    renderICTRequestList();
    if (activeICTRequestId) {
      const active = adminICTRequests.find(r => String(r.requestId) === String(activeICTRequestId));
      if (active) renderActiveICTRequest(active);
    }
    if (message && showLoading) message.innerHTML = "";
  } catch (error) {
    console.error("Load ICT requests error:", error);
    list.innerHTML = '<div class="ict-empty">Ralat memuatkan permohonan ICT.</div>';
  }
}

function filterICTRequests(filter) {
  activeICTFilter = String(filter || "ALL").toUpperCase();
  document.querySelectorAll(".ict-filter").forEach(btn => btn.classList.toggle("active", String(btn.dataset.filter || "") === activeICTFilter));
  renderICTRequestList();
}

function renderICTRequestList() {
  const list = document.getElementById("ictRequestList");
  if (!list) return;
  const filtered = adminICTRequests.filter(request => activeICTFilter === "ALL" || String(request.status || "BARU").toUpperCase() === activeICTFilter);
  list.innerHTML = "";
  if (!filtered.length) {
    list.innerHTML = '<div class="ict-empty">Tiada permohonan dalam kategori ini.</div>';
    return;
  }
  filtered.forEach(request => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ict-request-item" + (String(request.requestId) === String(activeICTRequestId) ? " active" : "");
    const status = String(request.status || "BARU").toUpperCase();
    const wa = String(request.whatsappStatus || "PENDING").toUpperCase();
    button.innerHTML =
      '<div class="ict-request-item-top"><strong>👤 ' + escapeHTML(request.nama || "Murid") + '</strong>' +
      '<span class="ict-status-badge ' + ictStatusClass(status) + '">' + escapeHTML(status) + '</span></div>' +
      '<small>' + escapeHTML(request.kelas || "") + ' • ' + escapeHTML(formatICTDate(request.createdAt)) + '</small>' +
      '<p>' + escapeHTML(request.problem || "Masalah ICT") + '</p>' +
      '<span class="ict-wa-mini ' + (wa === "SENT" ? "sent" : wa === "FAILED" ? "failed" : "pending") + '">WhatsApp: ' + escapeHTML(wa) + '</span>';
    button.onclick = () => openAdminICTRequest(request.requestId);
    list.appendChild(button);
  });
}

function updateICTRequestBadge() {
  const badge = document.getElementById("ictRequestBadge");
  if (!badge) return;
  const count = adminICTRequests.filter(r => String(r.status || "BARU").toUpperCase() === "BARU").length;
  badge.textContent = count;
  badge.classList.toggle("hidden", count === 0);
}

function openAdminICTRequest(requestId) {
  const request = adminICTRequests.find(r => String(r.requestId) === String(requestId));
  if (!request) return;
  activeICTRequestId = String(requestId);
  renderICTRequestList();
  renderActiveICTRequest(request);
}

function renderActiveICTRequest(request) {
  const empty = document.getElementById("ictRequestEmpty");
  const active = document.getElementById("ictRequestActive");
  if (!active) return;
  if (empty) empty.classList.add("hidden");
  active.classList.remove("hidden");
  setText("activeICTName", request.nama || "Murid");
  setText("activeICTMeta", request.kelas || "-");
  setText("activeICTId", request.requestId || "-");
  setText("activeICTPhone", request.whatsapp || "-");
  setText("activeICTDate", formatICTDate(request.createdAt));
  setText("activeICTProblem", request.problem || "-");
  setText("activeICTDescription", request.description || "Tiada penerangan.");

  const statusEl = document.getElementById("activeICTStatus");
  if (statusEl) {
    const status = String(request.status || "BARU").toUpperCase();
    statusEl.textContent = status;
    statusEl.className = "ict-status-badge " + ictStatusClass(status);
  }

  const replyInput = document.getElementById("ictReplyInput");
  if (replyInput && document.activeElement !== replyInput) replyInput.value = "";
  const result = document.getElementById("ictWhatsAppResult");
  if (result) {
    const wa = String(request.whatsappStatus || "PENDING").toUpperCase();
    if (wa === "SENT") {
      result.className = "ict-whatsapp-result success";
      result.textContent = "📲 WhatsApp berjaya dihantar.";
    } else if (wa === "FAILED") {
      result.className = "ict-whatsapp-result error";
      result.textContent = "⚠️ WhatsApp gagal dihantar. " + (request.whatsappError || "Semak konfigurasi WhatsApp Cloud API.");
    } else {
      result.className = "ict-whatsapp-result";
      result.textContent = "WhatsApp belum dihantar.";
    }
  }

  const previous = document.getElementById("activeICTPreviousReply");
  if (previous) {
    if (request.adminReply) {
      previous.classList.remove("hidden");
      setText("activeICTPreviousReplyText", request.adminReply);
      setText("activeICTPreviousReplyMeta", (request.admin || "Admin ICT") + (request.repliedAt ? " • " + formatICTDate(request.repliedAt) : ""));
    } else previous.classList.add("hidden");
  }
  const closeBtn = document.getElementById("ictCloseBtn");
  if (closeBtn) closeBtn.disabled = String(request.status || "BARU").toUpperCase() === "SELESAI";
}

async function replySelectedICTRequest() {
  const request = adminICTRequests.find(r => String(r.requestId) === String(activeICTRequestId));
  const input = document.getElementById("ictReplyInput");
  const button = document.getElementById("ictReplyBtn");
  const result = document.getElementById("ictWhatsAppResult");
  if (!request || !input) { alert("Sila pilih permohonan ICT dahulu."); return; }
  const reply = input.value.trim();
  if (!reply) { alert("Sila masukkan balasan terlebih dahulu."); input.focus(); return; }
  if (!confirm("Hantar balasan ini ke WhatsApp " + (request.whatsapp || "murid") + "?")) return;
  if (button) { button.disabled = true; button.textContent = "📲 Menghantar..."; }
  if (result) { result.className = "ict-whatsapp-result"; result.textContent = "Sedang menyimpan balasan dan menghantar ke WhatsApp..."; }

  try {
    const data = await apiRequest("replyICTRequest", { requestId: request.requestId, reply: reply, admin: "Admin ICT" });
    if (!data.success) { handleApiFailure(data); throw new Error(data.message || "Balasan gagal dihantar."); }
    if (data.whatsappSent) {
      if (result) { result.className = "ict-whatsapp-result success"; result.textContent = "✅ Balasan disimpan dan WhatsApp berjaya dihantar."; }
    } else if (result) {
      result.className = "ict-whatsapp-result error";
      result.textContent = "⚠️ Balasan disimpan, tetapi WhatsApp gagal dihantar. Semak konfigurasi WhatsApp Cloud API.";
    }
    input.value = "";
    await loadAdminICTRequests();
  } catch (error) {
    console.error("Reply ICT request:", error);
    if (result) { result.className = "ict-whatsapp-result error"; result.textContent = "❌ " + (error.message || "Ralat semasa menghantar balasan."); }
  } finally {
    if (button) { button.disabled = false; button.textContent = "📲 Hantar ke WhatsApp"; }
  }
}

async function closeSelectedICTRequest() {
  const request = adminICTRequests.find(r => String(r.requestId) === String(activeICTRequestId));
  if (!request) { alert("Sila pilih permohonan ICT dahulu."); return; }
  if (String(request.status || "").toUpperCase() === "SELESAI") return;
  if (!confirm("Tandakan permohonan " + request.requestId + " sebagai SELESAI?")) return;
  const button = document.getElementById("ictCloseBtn");
  if (button) { button.disabled = true; button.textContent = "Menyimpan..."; }
  try {
    const data = await apiRequest("closeICTRequest", { requestId: request.requestId });
    if (!data.success) { handleApiFailure(data); throw new Error(data.message || "Tidak dapat menutup permohonan."); }
    await loadAdminICTRequests();
  } catch (error) {
    console.error("Close ICT request:", error);
    alert(error.message || "Ralat semasa menutup permohonan.");
  } finally {
    if (button) { button.disabled = false; button.textContent = "✅ Tanda Selesai"; }
  }
}

function startAdminICTPolling() {
  stopAdminICTPolling();
  adminICTTimer = setInterval(async function() {
    if (!sessionToken) return;
    const section = document.getElementById("ictRequestsSection");
    if (!section || section.classList.contains("hidden")) return;
    try { await loadAdminICTRequests(); } catch (error) { console.error("ICT request polling:", error); }
  }, 10000);
}

function stopAdminICTPolling() {
  if (adminICTTimer) { clearInterval(adminICTTimer); adminICTTimer = null; }
}

function ictStatusClass(status) { return String(status || "BARU").toLowerCase().replace(/[^a-z]/g, ""); }
function formatICTDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ms-MY", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = String(value ?? ""); }

// ======================================
// LIVE CHAT - LOAD CONVERSATIONS
// ======================================

async function loadAdminChats() {

  const list =
    document.getElementById(
      "chatConversationList"
    );

  const count =
    document.getElementById(
      "chatConversationCount"
    );

  if (!list) {
    return;
  }

  list.innerHTML =
    '<div class="chat-empty">' +
    'Sedang memuatkan perbualan...' +
    '</div>';

  try {

    const data =
      await apiRequest(
        "getAdminChats"
      );

    if (!data.success) {

      handleApiFailure(data);

      list.innerHTML =
        '<div class="chat-empty">' +
        escapeHTML(
          data.message ||
          "Tidak dapat memuatkan chat."
        ) +
        '</div>';

      return;
    }

    const chats =
      Array.isArray(data.chats)
        ? data.chats
        : [];
adminChatConversations = chats;
    
    if (count) {
      count.textContent =
        chats.length;
    }

    list.innerHTML = "";

    if (chats.length === 0) {

      list.innerHTML =
        '<div class="chat-empty">' +
        'Belum ada perbualan.' +
        '</div>';

      return;
    }

    chats.forEach(chat => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "admin-chat-item";

      const student =
  chat.nama ||
  "Ibu Bapa / Penjaga";

const kelas =
  chat.kelas || "";

const message =
  chat.lastMessage ||
  "Mesej baharu";

      const unread =
        Number(
          chat.unread || 0
        );

      button.innerHTML =
  "<strong>" +
  "👤 " +
  escapeHTML(student) +
  "</strong>" +

  (
    kelas
      ?
      '<small class="chat-student-class">' +
      escapeHTML(kelas) +
      "</small>"
      :
      ""
  ) +

  "<p>" +
  escapeHTML(message) +
  "</p>" +

  (
    unread > 0
      ?
      '<span class="chat-item-unread">' +
      unread +
      "</span>"
      :
      ""
  );

      button.onclick =
        function() {

          openAdminChat(
            chat.chatId
          );

        };

      list.appendChild(
        button
      );

    });

  } catch (error) {

    console.error(
      "Load chat error:",
      error
    );

    list.innerHTML =
      '<div class="chat-empty">' +
      'Ralat memuatkan Live Chat.' +
      '</div>';

  }

}

// ======================================
// LIVE CHAT - OPEN CONVERSATION
// ======================================

async function openAdminChat(chatId) {

  if (!chatId) {
    return;
  }

  activeAdminChatId =
    String(chatId);

  // Cari maklumat murid untuk chat yang dipilih
const selectedChat =
  adminChatConversations.find(
    chat =>
      String(chat.chatId) ===
      String(chatId)
  ) || {};

const studentName =
  selectedChat.nama ||
  "Ibu Bapa / Penjaga";

const studentClass =
  selectedChat.kelas || "";

  const empty =
    document.getElementById(
      "chatRoomEmpty"
    );

  const active =
    document.getElementById(
      "chatRoomActive"
    );

  const messagesBox =
    document.getElementById(
      "adminChatMessages"
    );

  const nameElement =
    document.getElementById(
      "activeChatName"
    );

  const metaElement =
    document.getElementById(
      "activeChatMeta"
    );


  // ======================================
  // TUKAR PAPARAN
  // ======================================

  if (empty) {
    empty.classList.add("hidden");
  }

  if (active) {
    active.classList.remove("hidden");
  }


  // ======================================
  // HEADER CHAT
  // ======================================

  if (nameElement) {

  nameElement.textContent =
    studentName;

}


if (metaElement) {

  if (studentClass) {

    metaElement.textContent =
      studentClass +
      " • Ibu Bapa / Penjaga";

  } else {

    metaElement.textContent =
      "Ibu Bapa / Penjaga";

  }

}


  // ======================================
  // LOADING
  // ======================================

  if (messagesBox) {

    messagesBox.innerHTML =
      '<div class="chat-empty">' +
      'Sedang memuatkan mesej...' +
      '</div>';

  }


  try {

    const data =
      await apiRequest(
        "getAdminChatMessages",
        {
          chatId:
            activeAdminChatId
        }
      );


    if (!data.success) {

      handleApiFailure(data);

      if (messagesBox) {

        messagesBox.innerHTML =
          '<div class="chat-empty">' +
          escapeHTML(
            data.message ||
            "Tidak dapat membaca mesej."
          ) +
          '</div>';

      }

      return;
    }


    const messages =
      Array.isArray(data.messages)
        ? data.messages
        : [];


    renderAdminChatMessages(
      messages
    );


    // Refresh senarai supaya
    // unread badge dikemas kini
    loadAdminChats();


  } catch (error) {

    console.error(
      "Open chat error:",
      error
    );


    if (messagesBox) {

      messagesBox.innerHTML =
        '<div class="chat-empty">' +
        'Ralat membaca mesej.' +
        '</div>';

    }

  }

}


// ======================================
// LIVE CHAT - RENDER MESSAGES
// ======================================

function renderAdminChatMessages(
  messages
) {

  const box =
    document.getElementById(
      "adminChatMessages"
    );


  if (!box) {
    return;
  }


  box.innerHTML = "";


  if (!messages.length) {

    box.innerHTML =
      '<div class="chat-empty">' +
      'Belum ada mesej.' +
      '</div>';

    return;
  }


  messages.forEach(
    message => {

      const sender =
        String(
          message.sender || ""
        ).toUpperCase();


      const isAdmin =
        sender === "ADMIN";


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "admin-message-row " +
        (
          isAdmin
            ? "admin"
            : "parent"
        );


      const bubble =
        document.createElement(
          "div"
        );


      bubble.className =
        "admin-message-bubble";


      const text =
        document.createElement(
          "p"
        );


      text.textContent =
        message.message || "";


      const info =
        document.createElement(
          "small"
        );


      info.textContent =
        isAdmin
          ? "Admin ICT"
          : "Ibu Bapa";


      bubble.appendChild(
        text
      );


      bubble.appendChild(
        info
      );


      row.appendChild(
        bubble
      );


      box.appendChild(
        row
      );

    }
  );


  // Scroll terus ke mesej terbaru

  box.scrollTop =
    box.scrollHeight;

}

// ======================================
// LIVE CHAT - SEND ADMIN REPLY
// ======================================

async function sendAdminChat() {

  const input =
    document.getElementById("adminChatInput");

  const button =
    document.getElementById("adminChatSendBtn");


  if (!input) {
    console.error("adminChatInput tidak dijumpai");
    return;
  }


  if (!activeAdminChatId) {
    alert("Sila pilih perbualan dahulu.");
    return;
  }


  const message =
    input.value.trim();


  if (!message) {
    return;
  }


  if (button) {
    button.disabled = true;
    button.textContent = "Menghantar...";
  }


  try {

    const data =
      await apiRequest(
        "sendAdminReply",
        {
          chatId: activeAdminChatId,
          message: message
        }
      );


    if (!data.success) {

      handleApiFailure(data);

      alert(
        data.message ||
        "Mesej tidak berjaya dihantar."
      );

      return;
    }


    // Kosongkan input selepas berjaya
    input.value = "";


    // Baca semula perbualan
    await openAdminChat(
      activeAdminChatId
    );


    // Refresh senarai chat
    await loadAdminChats();


    input.focus();


  } catch (error) {

    console.error(
      "Send admin reply:",
      error
    );

    alert(
      "Ralat semasa menghantar mesej."
    );


  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "Hantar";
    }

  }

}

// ======================================
// LIVE CHAT - AUTO REFRESH
// ======================================

function startAdminChatPolling() {

  // Elakkan timer berganda
  stopAdminChatPolling();

  adminChatTimer = setInterval(
    async function() {

      // Jangan buat apa-apa jika admin belum login
      if (!sessionToken) {
        return;
      }

      // Pastikan tab Live Chat sedang dibuka
      const chatSection =
        document.getElementById(
          "chatSection"
        );

      if (
        !chatSection ||
        chatSection.classList.contains("hidden")
      ) {
        return;
      }

      try {

        // Refresh senarai perbualan
        await loadAdminChats();

        // Jika ada chat sedang dibuka,
        // refresh mesej chat tersebut
        if (activeAdminChatId) {

          await refreshActiveAdminChat();

        }

      } catch (error) {

        console.error(
          "Auto refresh chat:",
          error
        );

      }

    },

    5000
  );

}


// ======================================
// STOP AUTO REFRESH
// ======================================

function stopAdminChatPolling() {

  if (adminChatTimer) {

    clearInterval(
      adminChatTimer
    );

    adminChatTimer = null;

  }

}


// ======================================
// REFRESH CHAT YANG SEDANG DIBUKA
// ======================================

async function refreshActiveAdminChat() {

  if (!activeAdminChatId) {
    return;
  }

  try {

    const data =
      await apiRequest(
        "getAdminChatMessages",
        {
          chatId: activeAdminChatId
        }
      );


    if (!data.success) {

      handleApiFailure(data);
      return;

    }


    const messages =
      Array.isArray(data.messages)
        ? data.messages
        : [];


    renderAdminChatMessages(
      messages
    );


  } catch (error) {

    console.error(
      "Refresh active chat:",
      error
    );

  }

}

// ======================================
// API
// ======================================

async function apiRequest(
  action,
  params = {},
  requireToken = true
) {

  const query =
    new URLSearchParams();


  query.set(
    "action",
    action
  );


  if (requireToken) {

    query.set(
      "token",
      sessionToken
    );

  }


  Object.entries(params)
    .forEach(
      ([key,value]) => {

        query.set(
          key,
          value ?? ""
        );

      }
    );


  query.set(
    "t",
    Date.now()
  );


  const response =
    await fetch(
      API_URL +
      "?" +
      query.toString(),
      {
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "HTTP " +
      response.status
    );

  }


  return await response.json();

}


// ======================================
// SESSION
// ======================================

function handleApiFailure(data) {

  if (data && data.expired) {

    alert(
      "Sesi admin telah tamat. Sila log masuk semula."
    );

    logoutAdmin();

  }

}


// ======================================
// LOGOUT
// ======================================

function logoutAdmin() {

  sessionToken = "";
  stopAdminICTPolling();

  sessionStorage.removeItem(
    "delimaAdminToken"
  );


  document
    .getElementById("dashboardPage")
    .classList
    .add("hidden");


  document
    .getElementById("loginPage")
    .classList
    .remove("hidden");


  document
    .getElementById("adminPassword")
    .value = "";

}


// ======================================
// PASSWORD
// ======================================

function toggleAdminPassword() {

  const input =
    document
      .getElementById("adminPassword");


  input.type =
    input.type === "password"
      ? "text"
      : "password";

}


// ======================================
// LOGIN ERROR
// ======================================

function showLoginError(text) {

  document
    .getElementById("loginMessage")
    .innerHTML =
      '<div class="error">' +
      escapeHTML(text) +
      '</div>';

}


// ======================================
// TUTORIAL ERROR
// ======================================

function showTutorialFormError(text) {

  document
    .getElementById("tutorialFormMessage")
    .innerHTML =
      '<div class="error">' +
      escapeHTML(text) +
      '</div>';

}


// ======================================
// SAFE URL
// ======================================

function safeHttpUrl(value) {

  if (!value) {
    return "";
  }


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


// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(value) {

  const div =
    document.createElement("div");


  div.textContent =
    String(value ?? "");


  return div.innerHTML;

}


// ======================================
// SEARCH EVENTS
// ======================================

document
  .getElementById("studentSearch")
  .addEventListener(
    "input",
    renderStudents
  );


document
  .getElementById("classFilter")
  .addEventListener(
    "change",
    renderStudents
  );


// ======================================
// ENTER LOGIN
// ======================================

document
  .getElementById("adminPassword")
  .addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        adminLogin();

      }

    }
  );


// ======================================
// RESTORE SESSION
// ======================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const saved =
      sessionStorage.getItem(
        "delimaAdminToken"
      );


    if (saved) {

      sessionToken = saved;

      showDashboard();

    }

  }
);
