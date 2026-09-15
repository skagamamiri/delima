// ======================================================
// PORTAL PENGURUSAN DELIMA
// SK AGAMA (MIS) MIRI
// ======================================================

const SHEET_NAME = "MAIN";
const TUTORIAL_SHEET = "TUTORIAL";
const HELP_SHEET = "BANTUAN";
const CHAT_SHEET = "CHAT";
const PUSH_TOKEN_SHEET = "PUSH_TOKENS";

const MAX_ATTEMPTS = 5;
const BLOCK_SECONDS = 300;

// Admin session: 30 minit
const SESSION_SECONDS = 1800;


// ======================================================
// MAIN API
// ======================================================

function doGet(e) {

  try {

    const action = String(e.parameter.action || "");

    switch (action) {

      // PUBLIC
      case "search":
        return searchStudent(e);

      case "getTutorial":
        return getPublicTutorial();

      case "getHelp":
        return getPublicHelp();

      // LIVE CHAT - PARENT
      case "startChat": return startChat(e);
      case "sendChatMessage": return sendChatMessage(e);
      case "getChatMessages": return getChatMessages(e);

      // PUSH NOTIFICATION
case "registerPushToken":
  return registerPushToken(e);


      // ADMIN
      case "adminLogin":
        return adminLogin(e);

      case "adminData":
        return getAdminData(e);

      case "adminTutorial":
        return getAdminTutorial(e);

      case "saveTutorial":
        return saveTutorial(e);

      case "deleteTutorial":
        return deleteTutorial(e);

      case "getAdminHelp":
        return getAdminHelp(e);

      case "saveHelp":
        return saveHelp(e);

      // LIVE CHAT - ADMIN
      case "getAdminChats": return getAdminChats(e);
      case "getAdminChatMessages": return getAdminChatMessages(e);
      case "sendAdminReply": return sendAdminReply(e);
      case "closeChat": return closeChat(e);

      // ICT REQUESTS
      case "submitICTHelp": return submitICTHelp(e);
      case "getAdminICTRequests": return getAdminICTRequests(e);
      case "replyICTRequest": return replyICTRequest(e);
      case "closeICTRequest": return closeICTRequest(e);
      case "testWhatsApp": return testWhatsApp(e);


      default:

        return jsonResponse({
          success: false,
          message: "Permintaan tidak sah."
        });
    }

  } catch (error) {

    console.error(error);

    return jsonResponse({
      success: false,
      message: "Ralat sistem."
    });
  }
}


// ======================================================
// PUBLIC STUDENT SEARCH
// ======================================================

function searchStudent(e) {

  const nokp =
    String(e.parameter.nokp || "")
      .replace(/\D/g, "");

  const pin =
    String(e.parameter.pin || "")
      .replace(/\D/g, "");


  if (
    nokp.length !== 12 ||
    pin.length !== 4
  ) {

    return jsonResponse({
      success: false,
      message: "Maklumat tidak sah."
    });
  }


  const cache =
    CacheService.getScriptCache();

  const attemptKey =
    "attempt_" + nokp;

  const attempts =
    Number(cache.get(attemptKey) || 0);


  if (attempts >= MAX_ATTEMPTS) {

    return jsonResponse({
      success: false,
      blocked: true,
      message:
        "Terlalu banyak percubaan. Cuba semula selepas 5 minit."
    });
  }


  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(SHEET_NAME);


  if (!sheet) {

    return jsonResponse({
      success: false,
      message: "Ralat sistem."
    });
  }


  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {

    return jsonResponse({
      success: false
    });
  }


  const data =
    sheet
      .getRange(2, 1, lastRow - 1, 7)
      .getDisplayValues();


  for (let i = 0; i < data.length; i++) {

    const studentIC =
      String(data[i][1])
        .replace(/\D/g, "");

    const guardianPin =
      String(data[i][6])
        .replace(/\D/g, "");


    if (
      studentIC === nokp &&
      guardianPin === pin
    ) {

      cache.remove(attemptKey);


      return jsonResponse({

        success: true,

        nama:
          String(data[i][0]).trim(),

        kelas:
          String(data[i][5]).trim(),

        delima:
          String(data[i][2]).trim(),

        password:
          String(data[i][3]).trim()

      });
    }
  }


  const newAttempts =
    attempts + 1;


  cache.put(
    attemptKey,
    String(newAttempts),
    BLOCK_SECONDS
  );


  return jsonResponse({

    success: false,

    blocked:
      newAttempts >= MAX_ATTEMPTS,

    message:
      newAttempts >= MAX_ATTEMPTS
        ? "Terlalu banyak percubaan. Cuba semula selepas 5 minit."
        : "No. KP/MyKid atau PIN tidak sepadan."

  });
}


// ======================================================
// ADMIN LOGIN
// ======================================================

function adminLogin(e) {

  const username =
    String(e.parameter.username || "");

  const password =
    String(e.parameter.password || "");


  const properties =
    PropertiesService
      .getScriptProperties();


  const storedUsername =
    properties.getProperty(
      "ADMIN_USERNAME"
    );

  const storedHash =
    properties.getProperty(
      "ADMIN_PASSWORD_HASH"
    );


  if (!storedUsername || !storedHash) {

    return jsonResponse({
      success: false,
      message:
        "Akaun admin belum dikonfigurasi."
    });
  }


  const suppliedHash =
    sha256(password);


  if (
    username !== storedUsername ||
    suppliedHash !== storedHash
  ) {

    return jsonResponse({
      success: false,
      message:
        "Username atau kata laluan salah."
    });
  }


  const token =
    Utilities.getUuid() +
    Utilities.getUuid();


  CacheService
    .getScriptCache()
    .put(
      "admin_session_" + token,
      "1",
      SESSION_SECONDS
    );


  return jsonResponse({
    success: true,
    token: token
  });
}


// ======================================================
// VERIFY ADMIN
// ======================================================

function verifyAdmin(e) {

  const token =
    String(e.parameter.token || "");


  if (!token) {
    return false;
  }


  const cache =
    CacheService.getScriptCache();


  const key =
    "admin_session_" + token;


  const valid =
    cache.get(key);


  if (!valid) {
    return false;
  }


  // Refresh session
  cache.put(
    key,
    "1",
    SESSION_SECONDS
  );


  return true;
}


// ======================================================
// ADMIN DASHBOARD
// ======================================================

function getAdminData(e) {

  if (!verifyAdmin(e)) {

    return sessionExpired();
  }


  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(SHEET_NAME);


  if (!sheet) {

    return jsonResponse({
      success: false,
      message: "Sheet murid tidak dijumpai."
    });
  }


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return jsonResponse({

      success: true,

      stats: {
        totalStudents: 0,
        totalClasses: 0,
        totalAccounts: 0,
        missingPin: 0
      },

      students: []

    });
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        7
      )
      .getDisplayValues();


  const students = [];

  const classes =
    new Set();

  let accounts = 0;

  let missingPin = 0;


  data.forEach(row => {

    const nama =
      String(row[0]).trim();

    const nokp =
      String(row[1]).trim();

    const delima =
      String(row[2]).trim();

    const kelas =
      String(row[5]).trim();

    const pin =
      String(row[6]).trim();


    if (!nama && !nokp) {
      return;
    }


    if (kelas) {
      classes.add(kelas);
    }


    if (delima) {
      accounts++;
    }


    if (!pin) {
      missingPin++;
    }


    students.push({

      nama: nama,

      nokp: nokp,

      kelas: kelas,

      delima: delima,

      pin: pin

    });

  });


  return jsonResponse({

    success: true,

    stats: {

      totalStudents:
        students.length,

      totalClasses:
        classes.size,

      totalAccounts:
        accounts,

      missingPin:
        missingPin

    },

    students:
      students

  });
}


// ======================================================
// PUBLIC TUTORIAL
// ======================================================

function getPublicTutorial() {

  const sheet =
    getSheet(TUTORIAL_SHEET);


  if (!sheet || sheet.getLastRow() < 2) {

    return jsonResponse({
      success: true,
      tutorials: []
    });
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        6
      )
      .getDisplayValues();


  const tutorials =
    data
      .filter(row =>
        String(row[4])
          .trim()
          .toUpperCase() === "AKTIF"
      )
      .map(row => ({

        id: String(row[0]),

        tajuk:
          String(row[1]),

        penerangan:
          String(row[2]),

        link:
          String(row[3]),

        susunan:
          Number(row[5]) || 999

      }))
      .sort(
        (a, b) =>
          a.susunan - b.susunan
      );


  return jsonResponse({
    success: true,
    tutorials: tutorials
  });
}


// ======================================================
// ADMIN GET TUTORIAL
// ======================================================

function getAdminTutorial(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }


  const sheet =
    getSheet(TUTORIAL_SHEET);


  if (!sheet || sheet.getLastRow() < 2) {

    return jsonResponse({
      success: true,
      tutorials: []
    });
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        6
      )
      .getDisplayValues();


  const tutorials =
    data.map(row => ({

      id:
        String(row[0]),

      tajuk:
        String(row[1]),

      penerangan:
        String(row[2]),

      link:
        String(row[3]),

      status:
        String(row[4]),

      susunan:
        String(row[5])

    }));


  return jsonResponse({
    success: true,
    tutorials: tutorials
  });
}


// ======================================================
// SAVE TUTORIAL
// ======================================================

function saveTutorial(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }


  const sheet =
    getSheet(TUTORIAL_SHEET);


  if (!sheet) {

    return jsonResponse({
      success: false,
      message:
        "Sheet TUTORIAL tidak dijumpai."
    });
  }


  const id =
    String(e.parameter.id || "").trim();

  const tajuk =
    String(e.parameter.tajuk || "").trim();

  const penerangan =
    String(e.parameter.penerangan || "").trim();

  const link =
    String(e.parameter.link || "").trim();

  const status =
    String(e.parameter.status || "AKTIF")
      .trim()
      .toUpperCase();

  const susunan =
    Number(e.parameter.susunan) || 999;


  if (!tajuk) {

    return jsonResponse({
      success: false,
      message: "Tajuk diperlukan."
    });
  }


  // EDIT

  if (id) {

    const lastRow =
      sheet.getLastRow();


    if (lastRow >= 2) {

      const ids =
        sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            1
          )
          .getDisplayValues();


      for (
        let i = 0;
        i < ids.length;
        i++
      ) {

        if (
          String(ids[i][0]) === id
        ) {

          sheet
            .getRange(i + 2, 2, 1, 5)
            .setValues([[
              tajuk,
              penerangan,
              link,
              status,
              susunan
            ]]);


          return jsonResponse({
            success: true
          });
        }
      }
    }
  }


  // NEW

  const newId =
    Utilities.getUuid();


  sheet.appendRow([

    newId,

    tajuk,

    penerangan,

    link,

    status,

    susunan

  ]);


  return jsonResponse({
    success: true,
    id: newId
  });
}


// ======================================================
// DELETE TUTORIAL
// ======================================================

function deleteTutorial(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }


  const id =
    String(e.parameter.id || "");


  const sheet =
    getSheet(TUTORIAL_SHEET);


  if (!sheet || sheet.getLastRow() < 2) {

    return jsonResponse({
      success: false
    });
  }


  const ids =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        1
      )
      .getDisplayValues();


  for (
    let i = 0;
    i < ids.length;
    i++
  ) {

    if (
      String(ids[i][0]) === id
    ) {

      sheet.deleteRow(i + 2);


      return jsonResponse({
        success: true
      });
    }
  }


  return jsonResponse({
    success: false,
    message:
      "Tutorial tidak dijumpai."
  });
}


// ======================================================
// PUBLIC HELP
// ======================================================

function getPublicHelp() {

  return jsonResponse({
    success: true,
    help: readHelpSettings()
  });
}


// ======================================================
// ADMIN HELP
// ======================================================

function getAdminHelp(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }


  return jsonResponse({
    success: true,
    help: readHelpSettings()
  });
}


// ======================================================
// SAVE HELP
// ======================================================

function saveHelp(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }


  const sheet =
    getSheet(HELP_SHEET);


  if (!sheet) {

    return jsonResponse({
      success: false,
      message:
        "Sheet BANTUAN tidak dijumpai."
    });
  }


  const values = {

    TAJUK:
      String(e.parameter.tajuk || ""),

    PENERANGAN:
      String(e.parameter.penerangan || ""),

    PEGAWAI:
      String(e.parameter.pegawai || ""),

    WHATSAPP:
      String(e.parameter.whatsapp || "")
        .replace(/\D/g, ""),

    EMAIL:
      String(e.parameter.email || ""),

    WAKTU:
      String(e.parameter.waktu || "")

  };


  const rows =
    Object.entries(values);


  sheet.clearContents();


  sheet
    .getRange(1, 1, 1, 2)
    .setValues([
      ["FIELD", "VALUE"]
    ]);


  if (rows.length) {

    sheet
      .getRange(
        2,
        1,
        rows.length,
        2
      )
      .setValues(rows);
  }


  return jsonResponse({
    success: true
  });
}


// ======================================================
// READ HELP
// ======================================================

function readHelpSettings() {

  const sheet =
    getSheet(HELP_SHEET);


  const result = {

    tajuk: "Bantuan ICT",

    penerangan: "",

    pegawai: "",

    whatsapp: "",

    email: "",

    waktu: ""

  };


  if (!sheet || sheet.getLastRow() < 2) {

    return result;
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        2
      )
      .getDisplayValues();


  data.forEach(row => {

    const field =
      String(row[0])
        .trim()
        .toUpperCase();

    const value =
      String(row[1]).trim();


    switch (field) {

      case "TAJUK":
        result.tajuk = value;
        break;

      case "PENERANGAN":
        result.penerangan = value;
        break;

      case "PEGAWAI":
        result.pegawai = value;
        break;

      case "WHATSAPP":
        result.whatsapp = value;
        break;

      case "EMAIL":
        result.email = value;
        break;

      case "WAKTU":
        result.waktu = value;
        break;

    }

  });


  return result;
}

// ======================================================
// PUSH NOTIFICATION - REGISTER DEVICE
// ======================================================

function registerPushToken(e) {

  try {

    const token =
      String(
        e.parameter.token || ""
      ).trim();

    const role =
      String(
        e.parameter.role || ""
      )
      .trim()
      .toUpperCase();

    const studentId =
      String(
        e.parameter.studentId || ""
      ).trim();

    const chatId =
      String(
        e.parameter.chatId || ""
      ).trim();

    const deviceId =
      String(
        e.parameter.deviceId || ""
      ).trim();

    const platform =
      String(
        e.parameter.platform || ""
      )
      .trim()
      .toUpperCase();


    // ======================================
    // VALIDATION
    // ======================================

    if (!token) {

      return jsonResponse({
        success: false,
        message: "Push token diperlukan."
      });

    }


    if (
      role !== "ADMIN" &&
      role !== "PARENT"
    ) {

      return jsonResponse({
        success: false,
        message: "Role tidak sah."
      });

    }


    /*
      Parent mesti mempunyai chatId.

      Ini memastikan token Parent boleh
      dipadankan dengan perbualan yang betul.
    */

    if (
      role === "PARENT" &&
      !chatId
    ) {

      return jsonResponse({
        success: false,
        message:
          "Chat ID diperlukan untuk Parent."
      });

    }


    const sheet =
      getSheet(
        PUSH_TOKEN_SHEET
      );


    if (!sheet) {

      return jsonResponse({
        success: false,
        message:
          "Sheet PUSH_TOKENS tidak dijumpai."
      });

    }


    // ======================================
    // CARI TOKEN / DEVICE SEDIA ADA
    // ======================================

    const lastRow =
      sheet.getLastRow();


    let existingRow = -1;


    if (lastRow >= 2) {

      const data =
        sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            8
          )
          .getDisplayValues();


      for (
        let i = 0;
        i < data.length;
        i++
      ) {

        const existingToken =
          String(
            data[i][0] || ""
          ).trim();


        const existingDevice =
          String(
            data[i][4] || ""
          ).trim();


        /*
          Token yang sama ATAU
          Device ID yang sama akan dikemas kini,
          bukan tambah row baru.
        */

        if (
          existingToken === token ||
          (
            deviceId &&
            existingDevice === deviceId
          )
        ) {

          existingRow =
            i + 2;

          break;

        }

      }

    }


    // ======================================
    // DATA
    // ======================================

    const rowData = [

      token,                 // A TOKEN

      role,                  // B ROLE

      studentId,             // C STUDENT_ID

      chatId,                // D CHAT_ID

      deviceId,              // E DEVICE_ID

      platform || "WEB",     // F PLATFORM

      new Date(),            // G UPDATED_AT

      "ACTIVE"               // H STATUS

    ];


    // ======================================
    // UPDATE ATAU INSERT
    // ======================================

    if (existingRow > 0) {

      sheet
        .getRange(
          existingRow,
          1,
          1,
          8
        )
        .setValues([
          rowData
        ]);


      return jsonResponse({

        success: true,

        updated: true,

        message:
          "Peranti notifikasi dikemas kini."

      });

    }


    sheet.appendRow(
      rowData
    );


    return jsonResponse({

      success: true,

      created: true,

      message:
        "Peranti notifikasi berjaya didaftarkan."

    });


  } catch (error) {

    console.error(
      "registerPushToken:",
      error
    );


    return jsonResponse({

      success: false,

      message:
        "Pendaftaran notifikasi gagal."

    });

  }

}


// ======================================================
// LIVE CHAT
// ======================================================

function startChat(e) {
  const nokp = String(e.parameter.nokp || "").replace(/\D/g, "");
  const pin = String(e.parameter.pin || "").replace(/\D/g, "");
  if (nokp.length !== 12 || pin.length !== 4)
    return jsonResponse({success:false,message:"Maklumat pengesahan tidak sah."});

  const s = getSheet(SHEET_NAME);
  if (!s || s.getLastRow() < 2)
    return jsonResponse({success:false,message:"Data murid tidak dijumpai."});

  const data=s.getRange(2,1,s.getLastRow()-1,7).getDisplayValues();
  let student=null;
  for(let i=0;i<data.length;i++){
    if(String(data[i][1]).replace(/\D/g,"")===nokp &&
       String(data[i][6]).replace(/\D/g,"")===pin){
      student={nama:String(data[i][0]).trim(),kelas:String(data[i][5]).trim()};
      break;
    }
  }
  if(!student) return jsonResponse({success:false,message:"No. KP/MyKid atau PIN tidak sepadan."});

  const studentId=sha256(nokp).substring(0,20);
  const chatId=Utilities.getUuid();
  const sessionId=Utilities.getUuid()+Utilities.getUuid();
  const c=CacheService.getScriptCache();
  c.put("chat_session_"+sessionId,chatId,21600);
  c.put("chat_student_"+sessionId,studentId,21600);

  return jsonResponse({success:true,chatId,sessionId,student});
}

function verifyChatSession(chatId,sessionId){
  if(!chatId||!sessionId) return false;
  return CacheService.getScriptCache().get("chat_session_"+sessionId)===chatId;
}

function sendChatMessage(e) {

  const chatId =
    String(
      e.parameter.chatId || ""
    ).trim();

  const sessionId =
    String(
      e.parameter.sessionId || ""
    ).trim();

  const message =
    String(
      e.parameter.message || ""
    ).trim();


  // ======================================
  // VERIFY SESSION
  // ======================================

  if (
    !verifyChatSession(
      chatId,
      sessionId
    )
  ) {

    return jsonResponse({
      success: false,
      expired: true,
      message:
        "Sesi chat telah tamat."
    });

  }


  // ======================================
  // VALIDATE MESSAGE
  // ======================================

  if (!message) {

    return jsonResponse({
      success: false,
      message:
        "Sila masukkan mesej."
    });

  }


  if (message.length > 1000) {

    return jsonResponse({
      success: false,
      message:
        "Mesej terlalu panjang."
    });

  }


  // ======================================
  // CHAT SHEET
  // ======================================

  const s =
    getSheet(CHAT_SHEET);


  if (!s) {

    return jsonResponse({
      success: false,
      message:
        "Sheet CHAT tidak dijumpai."
    });

  }


  // ======================================
  // STUDENT ID
  // ======================================

  const studentId =
    CacheService
      .getScriptCache()
      .get(
        "chat_student_" +
        sessionId
      ) || "";


  const messageId =
    Utilities.getUuid();


  // ======================================
  // SAVE MESSAGE
  // ======================================

  s.appendRow([
    chatId,
    studentId,
    "PARENT",
    message,
    new Date(),
    "OPEN",
    "YES",
    "NO",
    sessionId,
    messageId
  ]);


  // ======================================
  // PUSH NOTIFICATION KE ADMIN
  // ======================================

  try {

    const pushCount =
      notifyAdminsNewChat(
        studentId,
        message
      );


    console.log(
      "Parent message push sent:",
      pushCount
    );


  } catch (pushError) {

    /*
      Push gagal tidak boleh menyebabkan
      mesej Parent gagal dihantar.
    */

    console.error(
      "Admin push notification failed:",
      pushError
    );

  }


  // ======================================
  // RESPONSE
  // ======================================

  return jsonResponse({
    success: true,
    messageId: messageId
  });

}

function getChatMessages(e){
  const chatId=String(e.parameter.chatId||"").trim();
  const sessionId=String(e.parameter.sessionId||"").trim();
  if(!verifyChatSession(chatId,sessionId))
    return jsonResponse({success:false,expired:true,message:"Sesi chat telah tamat."});

  const s=getSheet(CHAT_SHEET);
  if(!s||s.getLastRow()<2) return jsonResponse({success:true,messages:[]});
  const data=s.getRange(2,1,s.getLastRow()-1,10).getValues();
  const messages=[];
  data.forEach((r,i)=>{
    if(String(r[0])===chatId){
      messages.push({id:String(r[9]),sender:String(r[2]),message:String(r[3]),
        timestamp:r[4]?new Date(r[4]).toISOString():""});
      if(String(r[2])==="ADMIN") s.getRange(i+2,7).setValue("YES");
    }
  });
  return jsonResponse({success:true,messages});
}

function getAdminChats(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }

  const chatSheet = getSheet(CHAT_SHEET);

  if (!chatSheet || chatSheet.getLastRow() < 2) {
    return jsonResponse({
      success: true,
      chats: []
    });
  }


  // ======================================
  // BINA PETA STUDENT_ID -> NAMA / KELAS
  // ======================================

  const studentMap = {};

  const studentSheet = getSheet(SHEET_NAME);

  if (
    studentSheet &&
    studentSheet.getLastRow() >= 2
  ) {

    const students =
      studentSheet
        .getRange(
          2,
          1,
          studentSheet.getLastRow() - 1,
          7
        )
        .getDisplayValues();


    students.forEach(row => {

      const nama =
        String(row[0] || "").trim();

      const nokp =
        String(row[1] || "")
          .replace(/\D/g, "");

      const kelas =
        String(row[5] || "").trim();


      if (!nokp) {
        return;
      }


      const studentId =
        sha256(nokp)
          .substring(0, 20);


      studentMap[studentId] = {
        nama: nama,
        kelas: kelas
      };

    });

  }


  // ======================================
  // BACA CHAT
  // ======================================

  const data =
    chatSheet
      .getRange(
        2,
        1,
        chatSheet.getLastRow() - 1,
        10
      )
      .getValues();


  const map = {};


  data.forEach(row => {

    const chatId =
      String(row[0] || "");

    const studentId =
      String(row[1] || "");


    if (!chatId) {
      return;
    }


    if (!map[chatId]) {

      const student =
        studentMap[studentId] || {};


      map[chatId] = {

        chatId: chatId,

        studentId: studentId,

        nama:
          student.nama ||
          "Ibu Bapa / Penjaga",

        kelas:
          student.kelas ||
          "",

        status:
          String(
            row[5] || "OPEN"
          ),

        lastMessage: "",

        lastSender: "",

        timestamp: "",

        unread: 0

      };

    }


    map[chatId].lastMessage =
      String(row[3] || "");


    map[chatId].lastSender =
      String(row[2] || "");


    map[chatId].status =
      String(
        row[5] || "OPEN"
      );


    map[chatId].timestamp =
      row[4]
        ? new Date(row[4]).toISOString()
        : "";


    if (
      String(row[2]) === "PARENT" &&
      String(row[7])
        .toUpperCase() !== "YES"
    ) {

      map[chatId].unread++;

    }

  });


  const chats =
    Object
      .values(map)
      .sort(
        (a, b) =>
          String(b.timestamp)
            .localeCompare(
              String(a.timestamp)
            )
      );


  return jsonResponse({
    success: true,
    chats: chats
  });

}

function getAdminChatMessages(e){
  if(!verifyAdmin(e)) return sessionExpired();
  const chatId=String(e.parameter.chatId||"").trim();
  if(!chatId) return jsonResponse({success:false,message:"Chat ID diperlukan."});
  const s=getSheet(CHAT_SHEET);
  if(!s||s.getLastRow()<2) return jsonResponse({success:true,messages:[]});
  const data=s.getRange(2,1,s.getLastRow()-1,10).getValues();
  const messages=[];
  data.forEach((r,i)=>{
    if(String(r[0])===chatId){
      messages.push({id:String(r[9]),sender:String(r[2]),message:String(r[3]),
        timestamp:r[4]?new Date(r[4]).toISOString():""});
      if(String(r[2])==="PARENT") s.getRange(i+2,8).setValue("YES");
    }
  });
  return jsonResponse({success:true,messages});
}

function sendAdminReply(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }


  const chatId =
    String(
      e.parameter.chatId || ""
    ).trim();

  const message =
    String(
      e.parameter.message || ""
    ).trim();


  // ======================================
  // VALIDATION
  // ======================================

  if (
    !chatId ||
    !message
  ) {

    return jsonResponse({
      success: false,
      message:
        "Maklumat mesej tidak lengkap."
    });

  }


  if (message.length > 1000) {

    return jsonResponse({
      success: false,
      message:
        "Mesej terlalu panjang."
    });

  }


  // ======================================
  // CHAT SHEET
  // ======================================

  const s =
    getSheet(CHAT_SHEET);


  if (!s) {

    return jsonResponse({
      success: false,
      message:
        "Sheet CHAT tidak dijumpai."
    });

  }


  // ======================================
  // CARI STUDENT + SESSION
  // ======================================

  let studentId = "";
  let sessionId = "";


  if (s.getLastRow() >= 2) {

    const d =
      s
        .getRange(
          2,
          1,
          s.getLastRow() - 1,
          10
        )
        .getDisplayValues();


    for (
      let i = d.length - 1;
      i >= 0;
      i--
    ) {

      if (
        String(d[i][0]) === chatId
      ) {

        studentId =
          String(d[i][1]);

        sessionId =
          String(d[i][8]);

        break;

      }

    }

  }


  if (!studentId) {

    return jsonResponse({
      success: false,
      message:
        "Perbualan tidak dijumpai."
    });

  }


  // ======================================
  // SIMPAN REPLY ADMIN
  // ======================================

  const messageId =
    Utilities.getUuid();


  s.appendRow([
    chatId,
    studentId,
    "ADMIN",
    message,
    new Date(),
    "OPEN",
    "NO",
    "YES",
    sessionId,
    messageId
  ]);


  // ======================================
  // PUSH KE PARENT
  // ======================================

  try {

    const pushCount =
      notifyParentReply(
        chatId,
        message
      );


    console.log(
      "Admin reply push sent:",
      pushCount
    );


  } catch (pushError) {

    // Reply Admin tetap berjaya
    // walaupun push gagal.

    console.error(
      "Parent push failed:",
      pushError
    );

  }


  // ======================================
  // RESPONSE
  // ======================================

  return jsonResponse({
    success: true,
    messageId: messageId
  });

}

function closeChat(e){
  if(!verifyAdmin(e)) return sessionExpired();
  const chatId=String(e.parameter.chatId||"").trim();
  const s=getSheet(CHAT_SHEET);
  if(!s||s.getLastRow()<2) return jsonResponse({success:false,message:"Perbualan tidak dijumpai."});
  const d=s.getRange(2,1,s.getLastRow()-1,10).getDisplayValues();
  let found=false;
  d.forEach((r,i)=>{if(String(r[0])===chatId){s.getRange(i+2,6).setValue("CLOSED");found=true;}});
  return jsonResponse({success:found});
}


// ======================================================
// UTILITIES
// ======================================================

function getSheet(name) {

  return SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(name);
}


function sha256(value) {

  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      value,
      Utilities.Charset.UTF_8
    );


  return digest
    .map(byte =>
      (byte + 256)
        .toString(16)
        .slice(-2)
    )
    .join("");
}


function sessionExpired() {

  return jsonResponse({
    success: false,
    expired: true,
    message:
      "Sesi admin telah tamat."
  });
}


function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

// ======================================================
// FIREBASE CLOUD MESSAGING - HTTP v1
// ======================================================

function getFirebaseAccessToken() {

  const props =
    PropertiesService.getScriptProperties();

  const projectId =
    props.getProperty("FIREBASE_PROJECT_ID");

  const clientEmail =
    props.getProperty("FIREBASE_CLIENT_EMAIL");

  let privateKey =
    props.getProperty("FIREBASE_PRIVATE_KEY");


  if (
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Script Properties tidak lengkap."
    );
  }


  // Tukar literal \n kepada line break sebenar
  privateKey =
    privateKey.replace(
      /\\n/g,
      "\n"
    );


  const now =
    Math.floor(
      Date.now() / 1000
    );


  const header = {
    alg: "RS256",
    typ: "JWT"
  };


  const claim = {

    iss: clientEmail,

    scope:
      "https://www.googleapis.com/auth/firebase.messaging",

    aud:
      "https://oauth2.googleapis.com/token",

    iat: now,

    exp: now + 3600

  };


  const encodedHeader =
    Utilities.base64EncodeWebSafe(
      JSON.stringify(header)
    ).replace(/=+$/, "");


  const encodedClaim =
    Utilities.base64EncodeWebSafe(
      JSON.stringify(claim)
    ).replace(/=+$/, "");


  const unsignedToken =
    encodedHeader +
    "." +
    encodedClaim;


  const signature =
    Utilities.computeRsaSha256Signature(
      unsignedToken,
      privateKey
    );


  const encodedSignature =
    Utilities.base64EncodeWebSafe(
      signature
    ).replace(/=+$/, "");


  const jwt =
    unsignedToken +
    "." +
    encodedSignature;


  const response =
    UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "post",

        contentType:
          "application/x-www-form-urlencoded",

        payload: {
          grant_type:
            "urn:ietf:params:oauth:grant-type:jwt-bearer",

          assertion:
            jwt
        },

        muteHttpExceptions: true
      }
    );


  const code =
    response.getResponseCode();


  const text =
    response.getContentText();


  if (code !== 200) {

    console.error(
      "Firebase OAuth:",
      code,
      text
    );

    throw new Error(
      "Firebase OAuth gagal: " +
      code
    );
  }


  const data =
    JSON.parse(text);


  if (!data.access_token) {

    throw new Error(
      "Firebase access token tidak diterima."
    );
  }


  return data.access_token;

}


// ======================================================
// SEND FCM
// ======================================================

function sendFCMNotification(
  token,
  title,
  body,
  data
) {

  if (!token) {
    return false;
  }


  const props =
    PropertiesService.getScriptProperties();


  const projectId =
    props.getProperty(
      "FIREBASE_PROJECT_ID"
    );


  const accessToken =
    getFirebaseAccessToken();


  const messageData = {};


  /*
    FCM data values perlu dihantar sebagai string.
  */

  Object.keys(data || {})
    .forEach(function(key) {

      messageData[key] =
        String(data[key]);

    });


const payload = {

  message: {

    token: token,

    notification: {
      title: title,
      body: body
    },

    data: messageData,

    webpush: {

      notification: {

        icon:
          "https://skagamamiri.github.io/delima/assets/icon-192.png",

        badge:
          "https://skagamamiri.github.io/delima/assets/icon-192.png"

      },

      fcm_options: {

        link:
          (
            data &&
            data.url
          )
            ? String(data.url)
            : "https://skagamamiri.github.io/delima/"

      }

    }

  }

};

  const response =
    UrlFetchApp.fetch(

      "https://fcm.googleapis.com/v1/projects/" +
      encodeURIComponent(projectId) +
      "/messages:send",

      {

        method: "post",

        contentType:
          "application/json",

        headers: {

          Authorization:
            "Bearer " +
            accessToken

        },

        payload:
          JSON.stringify(payload),

        muteHttpExceptions:
          true

      }

    );


  const code =
    response.getResponseCode();


  const text =
    response.getContentText();


  console.log(
    "FCM response:",
    code,
    text
  );


  return (
    code >= 200 &&
    code < 300
  );

}

function testAdminPush() {

  const sheet =
    getSheet(
      PUSH_TOKEN_SHEET
    );


  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {

    throw new Error(
      "Tiada push token."
    );

  }


  const rows =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        8
      )
      .getDisplayValues();


  let sent = 0;


  rows.forEach(function(row) {

    const token =
      String(row[0] || "").trim();

    const role =
      String(row[1] || "")
        .trim()
        .toUpperCase();

    const status =
      String(row[7] || "")
        .trim()
        .toUpperCase();


    if (
      token &&
      role === "ADMIN" &&
      status === "ACTIVE"
    ) {

      const success =
        sendFCMNotification(

          token,

          "🔔 Portal DELIMa",

          "Ujian notifikasi Admin ICT berjaya.",

          {
            type: "TEST",
            role: "ADMIN"
          }

        );


      if (success) {
        sent++;
      }

    }

  });


  console.log(
    "Admin push sent:",
    sent
  );


  return sent;

}

// ======================================================
// NOTIFY ALL ADMINS - NEW PARENT CHAT MESSAGE
// ======================================================
// ======================================================
// NOTIFY PARENT - ADMIN REPLY
// ======================================================

function notifyParentReply(
  chatId,
  message
) {

  try {

    const pushSheet =
      getSheet(PUSH_TOKEN_SHEET);

    if (
      !pushSheet ||
      pushSheet.getLastRow() < 2
    ) {
      return 0;
    }


    // Preview mesej
    let preview =
      String(message || "")
        .trim()
        .replace(/\s+/g, " ");

    if (preview.length > 120) {

      preview =
        preview.substring(0, 120) + "…";

    }


    const rows =
      pushSheet
        .getRange(
          2,
          1,
          pushSheet.getLastRow() - 1,
          8
        )
        .getDisplayValues();


    let sent = 0;


    rows.forEach(function(row) {

      const token =
        String(row[0] || "")
          .trim();

      const role =
        String(row[1] || "")
          .trim()
          .toUpperCase();

      const tokenChatId =
        String(row[3] || "")
          .trim();

      const status =
        String(row[7] || "")
          .trim()
          .toUpperCase();


      // Hanya Parent untuk chat ini
      if (
        !token ||
        role !== "PARENT" ||
        status !== "ACTIVE" ||
        tokenChatId !== String(chatId)
      ) {
        return;
      }


      const success =
        sendFCMNotification(

          token,

          "💬 Balasan Admin ICT",

          preview ||
          "Admin ICT telah membalas mesej anda.",

          {
            type: "ADMIN_REPLY",
            chatId: String(chatId),

            // Nanti service worker boleh
            // gunakan URL ini
            url:
              "https://skagamamiri.github.io/delima/"
          }

        );


      if (success) {
        sent++;
      }

    });


    console.log(
      "Parent notifications sent:",
      sent
    );


    return sent;


  } catch (error) {

    console.error(
      "notifyParentReply:",
      error
    );

    return 0;

  }

}

function notifyAdminsNewChat(
  studentId,
  message
) {

  try {

    const pushSheet =
      getSheet(PUSH_TOKEN_SHEET);

    if (
      !pushSheet ||
      pushSheet.getLastRow() < 2
    ) {
      return 0;
    }


    // ======================================
    // CARI NAMA + KELAS MURID
    // ======================================

    let studentName =
      "Ibu Bapa / Penjaga";

    let studentClass =
      "";


    const studentSheet =
      getSheet(SHEET_NAME);


    if (
      studentSheet &&
      studentSheet.getLastRow() >= 2
    ) {

      const students =
        studentSheet
          .getRange(
            2,
            1,
            studentSheet.getLastRow() - 1,
            7
          )
          .getDisplayValues();


      for (
        let i = 0;
        i < students.length;
        i++
      ) {

        const row =
          students[i];

        const nokp =
          String(row[1] || "")
            .replace(/\D/g, "");


        if (!nokp) {
          continue;
        }


        const id =
          sha256(nokp)
            .substring(0, 20);


        if (
          id ===
          String(studentId)
        ) {

          studentName =
            String(
              row[0] ||
              "Ibu Bapa / Penjaga"
            ).trim();

          studentClass =
            String(
              row[5] || ""
            ).trim();

          break;

        }

      }

    }


    // ======================================
    // MESSAGE PREVIEW
    // ======================================

    let preview =
      String(message || "")
        .trim()
        .replace(/\s+/g, " ");


    if (
      preview.length > 100
    ) {

      preview =
        preview.substring(
          0,
          100
        ) + "…";

    }


    const bodyParts = [];


    if (studentClass) {

      bodyParts.push(
        studentClass
      );

    }


    if (preview) {

      bodyParts.push(
        preview
      );

    }


    const body =
      bodyParts.length
        ? bodyParts.join(" • ")
        : "Mesej baharu daripada ibu bapa.";


    // ======================================
    // AMBIL TOKEN ADMIN
    // ======================================

    const rows =
      pushSheet
        .getRange(
          2,
          1,
          pushSheet.getLastRow() - 1,
          8
        )
        .getDisplayValues();


    let sent = 0;


    rows.forEach(
      function(row) {

        const token =
          String(
            row[0] || ""
          ).trim();

        const role =
          String(
            row[1] || ""
          )
            .trim()
            .toUpperCase();

        const status =
          String(
            row[7] || ""
          )
            .trim()
            .toUpperCase();


        if (
          !token ||
          role !== "ADMIN" ||
          status !== "ACTIVE"
        ) {
          return;
        }


        const success =
          sendFCMNotification(

            token,

            "💬 " + studentName,

            body,

            {
  type:
    "NEW_PARENT_MESSAGE",

  studentId:
    String(studentId),

  url:
    "https://skagamamiri.github.io/delima/admin.html"
}

          );


        if (success) {
          sent++;
        }

      }
    );


    console.log(
      "Admin notifications sent:",
      sent
    );


    return sent;


  } catch (error) {

    console.error(
      "notifyAdminsNewChat:",
      error
    );

    /*
      Notification gagal tidak boleh
      menyebabkan chat Parent gagal.
    */

    return 0;

  }

}
// ======================================================
// ICT REQUEST BACKEND ADD-ON
// Portal Pengurusan DELIMa
// SK Agama (MIS) Miri
//
// Tambahkan kod ini ke Google Apps Script backend sedia ada.
// Jangan padam fungsi Live Chat / FCM yang telah ada.
// ======================================================

const ICT_REQUEST_SHEET = "ICT_REQUESTS";

// ======================================================
// TAMBAHAN DALAM doGet(e)
// ======================================================
// Tambahkan case berikut dalam switch(action):
//
// case "submitICTHelp": return submitICTHelp(e);
// case "getAdminICTRequests": return getAdminICTRequests(e);
// case "replyICTRequest": return replyICTRequest(e);
// case "closeICTRequest": return closeICTRequest(e);
// case "testWhatsApp": return testWhatsApp(e);
//

// ======================================================
// 1. TERIMA BORANG BANTUAN ICT
// ======================================================
function submitICTHelp(e) {

  const nama = String(e.parameter.nama || "").trim();
  const kelas = String(e.parameter.kelas || "").trim();
  const email = String(e.parameter.email || "").trim().toLowerCase();
  const phoneRaw = String(e.parameter.phone || "").trim(); // PILIHAN
  const problem = String(e.parameter.problem || "").trim();
  const description = String(e.parameter.description || "").trim();

  // Wajib: nama, kelas, email, jenis masalah.
  // No. WhatsApp adalah PILIHAN.
  if (!nama || !kelas || !email || !problem) {
    return jsonResponse({
      success: false,
      message: "Maklumat wajib belum lengkap."
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({
      success: false,
      message: "Alamat email ibu bapa/penjaga tidak sah."
    });
  }

  if (nama.length > 120 || kelas.length > 80 || description.length > 1000 || email.length > 150) {
    return jsonResponse({
      success: false,
      message: "Maklumat terlalu panjang."
    });
  }

  let phone = "";
  if (phoneRaw) {
    phone = normalizeWhatsAppNumber(phoneRaw);
    if (!phone) {
      return jsonResponse({
        success: false,
        message: "No. WhatsApp tidak sah. Kosongkan ruangan jika tidak diperlukan."
      });
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ICT_REQUEST_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(ICT_REQUEST_SHEET);
    sheet.getRange(1, 1, 1, 16).setValues([[
      "REQUEST_ID", "CREATED_AT", "UPDATED_AT", "NAMA", "KELAS", "WHATSAPP",
      "MASALAH", "PENERANGAN", "STATUS", "ADMIN_REPLY", "REPLIED_AT",
      "WHATSAPP_STATUS", "WHATSAPP_MESSAGE_ID", "WHATSAPP_ERROR", "ADMIN", "EMAIL"
    ]]);
    sheet.setFrozenRows(1);
  } else {
    // Keserasian dengan ICT_REQUESTS lama (15 kolum).
    const headers = ["EMAIL", "EMAIL_STATUS", "EMAIL_ERROR"];
    headers.forEach(function (name, index) {
      const col = 16 + index;
      if (String(sheet.getRange(1, col).getValue() || "").trim() !== name) {
        sheet.getRange(1, col).setValue(name);
      }
    });
  }

  const requestId = "ICT-" + Utilities.getUuid().split("-")[0].toUpperCase();
  const now = new Date();

  // Simpan EMAIL di kolum 16 supaya struktur kolum lama kekal serasi.
  sheet.appendRow([
    requestId, now, now, nama, kelas, phone, problem, description,
    "BARU", "", "", "PENDING", "", "", "", email
  ]);

  return jsonResponse({
    success: true,
    requestId: requestId,
    message: "Permohonan Bantuan ICT berjaya dihantar."
  });
}

// ======================================================
// 2. SENARAI PERMOHONAN UNTUK ADMIN
// ======================================================
function getAdminICTRequests(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }

  const sheet = getSheet(ICT_REQUEST_SHEET);

  if (!sheet || sheet.getLastRow() < 2) {
    return jsonResponse({ success: true, requests: [] });
  }

  const lastCol = Math.max(16, sheet.getLastColumn());
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();

  const requests = data.map(function (r) {
    return {
      requestId: String(r[0] || ""),
      createdAt: r[1] ? new Date(r[1]).toISOString() : "",
      updatedAt: r[2] ? new Date(r[2]).toISOString() : "",
      nama: String(r[3] || ""),
      kelas: String(r[4] || ""),
      whatsapp: String(r[5] || ""),
      problem: String(r[6] || ""),
      description: String(r[7] || ""),
      status: String(r[8] || "BARU"),
      adminReply: String(r[9] || ""),
      repliedAt: r[10] ? new Date(r[10]).toISOString() : "",
      whatsappStatus: String(r[11] || "PENDING"),
      whatsappMessageId: String(r[12] || ""),
      whatsappError: String(r[13] || ""),
      admin: String(r[14] || ""),
      email: String(r[15] || ""),
      emailStatus: String(r[16] || "PENDING"),
      emailError: String(r[17] || "")
    };
  });

  requests.sort(function (a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  return jsonResponse({ success: true, requests: requests });
}

// ======================================================
// 3. ADMIN BALAS + HANTAR KE WHATSAPP
// ======================================================
function replyICTRequest(e) {

  if (!verifyAdmin(e)) return sessionExpired();

  const requestId = String(e.parameter.requestId || "").trim();
  const reply = String(e.parameter.reply || "").trim();
  const admin = String(e.parameter.admin || "Admin ICT").trim();

  if (!requestId || !reply) {
    return jsonResponse({ success: false, message: "Request ID dan balasan diperlukan." });
  }
  if (reply.length > 4000) {
    return jsonResponse({ success: false, message: "Balasan terlalu panjang." });
  }

  const sheet = getSheet(ICT_REQUEST_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonResponse({ success: false, message: "Permohonan ICT tidak dijumpai." });
  }

  // Pastikan kolum email/status wujud untuk rekod lama.
  if (String(sheet.getRange(1, 16).getValue() || "").trim() !== "EMAIL") {
    sheet.getRange(1, 16).setValue("EMAIL");
  }
  if (String(sheet.getRange(1, 17).getValue() || "").trim() !== "EMAIL_STATUS") {
    sheet.getRange(1, 17).setValue("EMAIL_STATUS");
  }
  if (String(sheet.getRange(1, 18).getValue() || "").trim() !== "EMAIL_ERROR") {
    sheet.getRange(1, 18).setValue("EMAIL_ERROR");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(18, sheet.getLastColumn())).getValues();
  let rowNumber = -1;
  let email = "";
  let studentName = "";

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === requestId) {
      rowNumber = i + 2;
      studentName = String(data[i][3] || "").trim();
      email = String(data[i][15] || "").trim();
      break;
    }
  }

  if (rowNumber < 0) {
    return jsonResponse({ success: false, message: "Permohonan tidak dijumpai." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ success: false, message: "Permohonan ini tiada email ibu bapa/penjaga yang sah." });
  }

  const now = new Date();
  sheet.getRange(rowNumber, 3).setValue(now);
  sheet.getRange(rowNumber, 9).setValue("DIBALAS");
  sheet.getRange(rowNumber, 10).setValue(reply);
  sheet.getRange(rowNumber, 11).setValue(now);
  sheet.getRange(rowNumber, 15).setValue(admin || "Admin ICT");
  sheet.getRange(rowNumber, 17).setValue("SENDING");
  sheet.getRange(rowNumber, 18).clearContent();

  let result;
  try {
    result = sendICTEmail(email, studentName, requestId, reply);
  } catch (error) {
    result = { success: false, error: String(error && error.message ? error.message : error) };
  }

  if (result.success) {
    sheet.getRange(rowNumber, 17).setValue("SENT");
    sheet.getRange(rowNumber, 18).clearContent();
  } else {
    sheet.getRange(rowNumber, 17).setValue("FAILED");
    sheet.getRange(rowNumber, 18).setValue(String(result.error || "Email gagal dihantar.").substring(0, 500));
  }

  return jsonResponse({
    success: true,
    emailSent: !!result.success,
    emailStatus: result.success ? "SENT" : "FAILED",
    emailError: result.success ? "" : String(result.error || "")
  });
}

// ======================================================
// HANTAR BALASAN ICT MELALUI EMAIL
// ======================================================
function sendICTEmail(email, studentName, requestId, reply) {

  const subject = "🆘 Balasan Bantuan ICT - " + requestId + " | SK Agama (MIS) Miri";
  const safeName = escapeHtmlICT(studentName || "Ibu Bapa/Penjaga");
  const safeReply = escapeHtmlICT(reply || "").replace(/\n/g, "<br>");

  const htmlBody =
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17324d">' +
    '<h2>🆘 Balasan Bantuan ICT</h2>' +
    '<p>Assalamualaikum <strong>' + safeName + '</strong>,</p>' +
    '<p>Admin ICT <strong>SK Agama (MIS) Miri</strong> telah memberikan balasan kepada permohonan bantuan ICT anda.</p>' +
    '<div style="padding:16px;border:1px solid #dbe5ef;border-radius:10px;background:#f7fafc">' +
    safeReply +
    '</div>' +
    '<p><strong>No. rujukan:</strong> ' + escapeHtmlICT(requestId) + '</p>' +
    '<p>Terima kasih.<br>Admin ICT<br>SK Agama (MIS) Miri</p>' +
    '</div>';

  const body =
    'Assalamualaikum ' + (studentName || 'Ibu Bapa/Penjaga') + ',\n\n' +
    'Balasan Admin ICT SK Agama (MIS) Miri:\n\n' +
    reply + '\n\n' +
    'No. rujukan: ' + requestId + '\n\n' +
    'Terima kasih.\nAdmin ICT\nSK Agama (MIS) Miri';

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: "Admin ICT SK Agama (MIS) Miri"
  });

  return { success: true };
}

function escapeHtmlICT(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ======================================================
// 4. TUTUP PERMOHONAN
// ======================================================
function closeICTRequest(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }

  const requestId = String(e.parameter.requestId || "").trim();
  const sheet = getSheet(ICT_REQUEST_SHEET);

  if (!requestId || !sheet || sheet.getLastRow() < 2) {
    return jsonResponse({
      success: false,
      message: "Permohonan tidak dijumpai."
    });
  }

  const data = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === requestId) {
      sheet.getRange(i + 2, 3).setValue(new Date());
      sheet.getRange(i + 2, 9).setValue("SELESAI");
      return jsonResponse({
        success: true
      });
    }
  }

  return jsonResponse({
    success: false,
    message: "Permohonan tidak dijumpai."
  });
}

// ======================================================
// WHATSAPP CLOUD API
// ======================================================
// Script Properties yang diperlukan:
// WA_ACCESS_TOKEN
// WA_PHONE_NUMBER_ID
// WA_GRAPH_VERSION       contoh: v23.0
// WA_SEND_MODE           TEMPLATE atau TEXT
// WA_TEMPLATE_NAME       jika TEMPLATE
// WA_TEMPLATE_LANG       contoh: ms / en_US
//
// TEXT hanya sesuai apabila WhatsApp membenarkan free-form
// message dalam conversation window. Untuk mesej pertama
// kepada pengguna daripada borang web, gunakan TEMPLATE.
// ======================================================
function sendICTWhatsApp(phone, studentName, reply) {

  const props = PropertiesService.getScriptProperties();

  const token = String(props.getProperty("WA_ACCESS_TOKEN") || "").trim();
  const phoneNumberId = String(props.getProperty("WA_PHONE_NUMBER_ID") || "").trim();
  const version = String(props.getProperty("WA_GRAPH_VERSION") || "").trim();
  const mode = String(props.getProperty("WA_SEND_MODE") || "TEMPLATE").trim().toUpperCase();

  if (!token || !phoneNumberId || !version) {
    return {
      success: false,
      error: "WhatsApp belum dikonfigurasi. Tetapkan WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID dan WA_GRAPH_VERSION."
    };
  }

  const to = normalizeWhatsAppNumber(phone);

  if (!to) {
    return {
      success: false,
      error: "No. WhatsApp tidak sah."
    };
  }

  const endpoint =
    "https://graph.facebook.com/" +
    encodeURIComponent(version) +
    "/" +
    encodeURIComponent(phoneNumberId) +
    "/messages";

  let payload;

  if (mode === "TEXT") {

    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        preview_url: false,
        body: buildICTWhatsAppText(studentName, reply)
      }
    };

  } else {

    const templateName = String(props.getProperty("WA_TEMPLATE_NAME") || "").trim();
    const templateLang = String(props.getProperty("WA_TEMPLATE_LANG") || "ms").trim();

    if (!templateName) {
      return {
        success: false,
        error: "WA_TEMPLATE_NAME belum ditetapkan."
      };
    }

    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLang
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: String(studentName || "Murid")
              },
              {
                type: "text",
                text: String(reply)
              }
            ]
          }
        ]
      }
    };
  }

  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();

  let result = {};
  try {
    result = JSON.parse(body);
  } catch (ignore) {}

  if (code < 200 || code >= 300) {
    return {
      success: false,
      error: "WhatsApp API HTTP " + code + ": " + body.substring(0, 500)
    };
  }

  const messageId =
    result &&
    result.messages &&
    result.messages[0] &&
    result.messages[0].id
      ? String(result.messages[0].id)
      : "";

  return {
    success: true,
    messageId: messageId
  };
}

function buildICTWhatsAppText(studentName, reply) {
  return [
    "Assalamualaikum " + (studentName || "").trim() + ",",
    "",
    "🆘 Balasan Admin ICT SK Agama (MIS) Miri",
    "",
    String(reply || "").trim(),
    "",
    "Terima kasih."
  ].join("\n");
}

function normalizeWhatsAppNumber(value) {

  let digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  // Malaysia: 0123456789 -> 60123456789
  if (digits.indexOf("60") === 0) {
    return digits;
  }

  if (digits.indexOf("0") === 0) {
    return "60" + digits.substring(1);
  }

  // Jika pengguna memasukkan nombor antarabangsa lain,
  // kekalkan nombor tersebut.
  return digits;
}

// ======================================================
// 5. UJIAN WHATSAPP DARI APPS SCRIPT
// ======================================================
// Jalankan secara manual selepas Script Properties siap:
// testWhatsAppSend()
// ======================================================
function testWhatsAppSend() {

  const props = PropertiesService.getScriptProperties();
  const testPhone = String(props.getProperty("WA_TEST_PHONE") || "").trim();

  if (!testPhone) {
    throw new Error("Tetapkan WA_TEST_PHONE dahulu dalam Script Properties.");
  }

  const result = sendICTWhatsApp(
    testPhone,
    "Ujian Sistem",
    "Ini ialah mesej ujian daripada Portal Pengurusan DELIMa SK Agama (MIS) Miri."
  );

  console.log(JSON.stringify(result));

  if (!result.success) {
    throw new Error(result.error || "WhatsApp test gagal.");
  }

  return result;
}

// ======================================================
// OPTIONAL: ADMIN TEST ENDPOINT
// ======================================================
function testWhatsApp(e) {

  if (!verifyAdmin(e)) {
    return sessionExpired();
  }

  const phone = String(e.parameter.phone || "").trim();
  const message = String(e.parameter.message || "").trim();

  if (!phone || !message) {
    return jsonResponse({
      success: false,
      message: "No. WhatsApp dan mesej diperlukan."
    });
  }

  const result = sendICTWhatsApp(
    phone,
    "Ujian",
    message
  );

  return jsonResponse(result);
}
