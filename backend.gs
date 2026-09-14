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
