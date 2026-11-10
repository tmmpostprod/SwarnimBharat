/**
 * ========================================================
 * 🇮🇳 Swarnim Bharat Udayghosh - Google Apps Script Webhook
 * ========================================================
 * 
 * Supports:
 * - Full Name, State, Vow Focus, Email
 * - Citizen Photo (Base64 decoded & saved to Google Drive)
 * - Live Counter (doGet & doPost returning { count })
 * 
 * SETUP INSTRUCTIONS:
 * 1. Google Drive me Spreadsheet banayein: "Swarnim Bharat Pledges"
 * 2. Extensions > Apps Script me ye code paste karein.
 * 3. Deploy > New deployment > Web app chunein.
 * 4. Execute as: "Me" | Who has access: "Anyone"
 * 5. Deploy dabayein aur URL copy karke index.html me GOOGLE_SCRIPT_URL me paste karein.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp (IST)", 
        "Full Name (पूरा नाम)", 
        "Phone (फ़ोन नंबर)",
        "State (राज्य)", 
        "Vow / Focus (संकल्प)", 
        "Email (ईमेल)", 
        "Citizen Photo (फोटो लिंक)",
        "Pledge Registry ID"
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#d4af37").setFontColor("#132c4d");
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

    var fullName = data.full_name || data.fullName || "Citizen of Bharat";
    var phoneNumber = data.phone_number || data.phoneNumber || data.phone || data.contact_mobile || "";
    var state = data.state || "Bharat";
    var vowFocus = data.vow_focus || data.focus || "Viksit Bharat 2047";
    var email = data.email || "";
    var photoUrl = "No Photo Uploaded";

    // Photo Base64 handling: save to Google Drive
    if (data.photoBase64 && data.photoBase64.indexOf("base64,") !== -1) {
      try {
        var parts = data.photoBase64.split("base64,");
        var contentType = parts[0].split(":")[1].split(";")[0] || "image/jpeg";
        var decoded = Utilities.base64Decode(parts[1]);
        var fileName = (fullName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now() + ".jpg");
        var blob = Utilities.newBlob(decoded, contentType, fileName);
        
        // Save file to Google Drive
        var file = DriveApp.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();
      } catch (photoErr) {
        photoUrl = "Error saving photo: " + photoErr.toString();
      }
    }

    var baseCount = 124;
    var rowCount = Math.max(0, sheet.getLastRow()); // includes newly appended
    var totalCount = baseCount + rowCount;
    var pledgeId = "SB-2047-" + totalCount;

    // Append new row
    sheet.appendRow([formattedDate, fullName, phoneNumber, state, vowFocus, email, photoUrl, pledgeId]);

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        result: "success",
        count: totalCount + 1,
        photoUrl: photoUrl,
        pledgeId: pledgeId 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rowCount = Math.max(0, sheet.getLastRow() - 1);
    var baseCount = 1429876;
    var totalCount = baseCount + rowCount;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        count: totalCount,
        submissions: rowCount,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", count: 1429876, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
