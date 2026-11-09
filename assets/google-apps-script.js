/**
 * ========================================================
 * 🇮🇳 Swarnim Bharat Udayghosh - Google Sheets Webhook Script
 * ========================================================
 * 
 * Ye code aapki Google Sheet me real-time form data store karta hai
 * aur website ko live total count provide karta hai.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Google Drive me nayi Google Sheet banayein (naam: "Swarnim Bharat Pledges")
 * 2. Menu me jayein: Extensions > Apps Script
 * 3. Wahan pehle se likha hua sab kuch hata kar ye pura code paste karein.
 * 4. Upar "Deploy" button dabayein > "New deployment" select karein.
 * 5. Type me "Web app" select karein.
 * 6. "Who has access" me "Anyone" select karein (ZAROORI HAI).
 * 7. "Deploy" dabayein aur jo Web App URL mile use copy karein.
 * 8. index.html me GOOGLE_SHEETS_WEBHOOK_URL me wo link paste kar dein.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Agar sheet khali hai to Headers banayein
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp (IST)", 
        "Full Name (पूरा नाम)", 
        "State / UT (राज्य)", 
        "Sankalp Focus (संकल्प)", 
        "Pledge ID (प्रमाण पत्र संख्या)"
      ]);
      // Header ko bold aur gold styling dein
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#d4af37").setFontColor("#132c4d");
      sheet.setFrozenRows(1);
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter;
    }

    var now = new Date();
    var formattedDate = Utilities.formatDate(now, "Asia/Kolkata", "dd-MMM-yyyy hh:mm:ss a");

    var fullName = data.fullName || "Citizen of Bharat";
    var state = data.state || "Bharat";
    var focus = data.focus || "Viksit Bharat";
    var pledgeId = data.pledgeId || ("SB-" + (sheet.getLastRow() + 1430493));

    // Nayi row add karein
    sheet.appendRow([formattedDate, fullName, state, focus, pledgeId]);

    return ContentService
      .createTextOutput(JSON.stringify({ 
        result: "success", 
        row: sheet.getLastRow(), 
        count: sheet.getLastRow() - 1 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rowCount = Math.max(0, sheet.getLastRow() - 1); // Header row minus kar ke
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        count: rowCount,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
