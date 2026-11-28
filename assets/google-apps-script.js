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
        "Admin Certificate Copy (प्रमाण पत्र)",
        "Pledge Registry ID"
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#d4af37").setFontColor("#132c4d");
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
    var certUrl = "No Certificate Uploaded";

    // Dedicated Private Admin Vault Folder in Google Drive (NOT Public)
    var folderName = "Swarnim_Bharat_Admin_Vault";
    var folders = DriveApp.getFoldersByName(folderName);
    var vaultFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    // 1. Citizen Photo Base64 handling: save to Admin Vault
    if (data.photoBase64 && data.photoBase64.indexOf("base64,") !== -1) {
      try {
        var parts = data.photoBase64.split("base64,");
        var contentType = parts[0].split(":")[1].split(";")[0] || "image/jpeg";
        var decoded = Utilities.base64Decode(parts[1]);
        var fileName = ("Photo_" + fullName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now() + ".jpg");
        var blob = Utilities.newBlob(decoded, contentType, fileName);
        
        // Save file inside private vault folder
        var file = vaultFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        photoUrl = file.getUrl();
      } catch (photoErr) {
        photoUrl = "Error saving photo: " + photoErr.toString();
      }
    }

    // 2. Full Certificate Base64 handling: save directly to Admin Vault (Private to Admin)
    if (data.certBase64 && data.certBase64.indexOf("base64,") !== -1) {
      try {
        var cParts = data.certBase64.split("base64,");
        var cContentType = cParts[0].split(":")[1].split(";")[0] || "image/jpeg";
        var cDecoded = Utilities.base64Decode(cParts[1]);
        var cFileName = ("Certificate_" + fullName.replace(/[^a-zA-Z0-9]/g, "_") + "_" + Date.now() + ".jpg");
        var cBlob = Utilities.newBlob(cDecoded, cContentType, cFileName);
        
        // Saved strictly private to admin Drive account (NOT shared publicly)
        var cFile = vaultFolder.createFile(cBlob);
        certUrl = cFile.getUrl();
      } catch (cErr) {
        certUrl = "Error saving certificate: " + cErr.toString();
      }
    }

    var baseCount = 125;
    var rowCount = Math.max(0, sheet.getLastRow()); // includes newly appended
    var totalCount = baseCount + rowCount;
    var pledgeId = "SB-2047-" + totalCount;

    // Check Row 1 headers dynamically to match user's custom columns (Date, Name, State, Vow, Email, Photo URL)
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = [];
    if (sheet.getLastRow() > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return h ? h.toString().toLowerCase().trim() : '';
      });
    }

    // Dynamic Column Matching
    if (headers.length > 0 && headers[0] !== '') {
      // Check if Phone column exists in headers; if not, automatically add it!
      var hasPhoneHeader = false;
      for (var k = 0; k < headers.length; k++) {
        var hk = headers[k];
        if (hk.indexOf('phone') !== -1 || hk.indexOf('mobile') !== -1 || hk.indexOf('फोन') !== -1 || hk.indexOf('फ़ोन') !== -1) {
          hasPhoneHeader = true;
          break;
        }
      }

      if (!hasPhoneHeader) {
        var newPhoneCol = headers.length + 1;
        sheet.getRange(1, newPhoneCol).setValue("Phone (फ़ोन नंबर)").setFontWeight("bold").setBackground("#d4af37").setFontColor("#132c4d");
        headers.push('phone');
      }

      // Check if Certificate column exists; if not, automatically add it!
      var hasCertHeader = false;
      for (var ck = 0; ck < headers.length; ck++) {
        var hck = headers[ck];
        if (hck.indexOf('cert') !== -1 || hck.indexOf('प्रमाण') !== -1) {
          hasCertHeader = true;
          break;
        }
      }

      if (!hasCertHeader) {
        var newCertCol = headers.length + 1;
        sheet.getRange(1, newCertCol).setValue("Admin Certificate Copy (प्रमाण पत्र)").setFontWeight("bold").setBackground("#d4af37").setFontColor("#132c4d");
        headers.push('certificate');
      }

      var row = [];
      for (var i = 0; i < headers.length; i++) {
        var h = headers[i];
        if (h.indexOf('date') !== -1 || h.indexOf('time') !== -1) {
          row.push(formattedDate);
        } else if (h.indexOf('name') !== -1 || h.indexOf('नाम') !== -1) {
          row.push(fullName);
        } else if (h.indexOf('state') !== -1 || h.indexOf('राज्य') !== -1) {
          row.push(state);
        } else if (h.indexOf('vow') !== -1 || h.indexOf('focus') !== -1 || h.indexOf('संकल्प') !== -1) {
          row.push(vowFocus);
        } else if (h.indexOf('email') !== -1 || h.indexOf('ईमेल') !== -1) {
          row.push(email);
        } else if (h.indexOf('photo') !== -1 || h.indexOf('फोटो') !== -1 || h.indexOf('image') !== -1) {
          row.push(photoUrl);
        } else if (h.indexOf('cert') !== -1 || h.indexOf('प्रमाण') !== -1) {
          row.push(certUrl);
        } else if (h.indexOf('phone') !== -1 || h.indexOf('mobile') !== -1 || h.indexOf('फोन') !== -1 || h.indexOf('फ़ोन') !== -1) {
          row.push(phoneNumber);
        } else if (h.indexOf('id') !== -1 || h.indexOf('registry') !== -1) {
          row.push(pledgeId);
        } else {
          row.push('');
        }
      }
      sheet.appendRow(row);
    } else {
      // Default fallback if sheet has no headers
      sheet.appendRow([formattedDate, fullName, state, vowFocus, email, photoUrl, certUrl, phoneNumber, pledgeId]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        result: "success",
        count: totalCount + 1,
        photoUrl: photoUrl,
        certUrl: certUrl,
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
    var lastRow = sheet.getLastRow();
    var rowCount = Math.max(0, lastRow - 1);
    var baseCount = 125;
    var totalCount = baseCount + rowCount;
    
    // Check if search query is provided (Search by Mobile Number or Pledge ID)
    var query = (e && e.parameter && (e.parameter.query || e.parameter.search || e.parameter.q)) ? 
                (e.parameter.query || e.parameter.search || e.parameter.q).toString().trim().toLowerCase() : '';

    if (query && lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
        return h ? h.toString().toLowerCase().trim() : '';
      });

      // Find column indices
      var colName = -1, colPhone = -1, colState = -1, colVow = -1, colEmail = -1, colPhoto = -1, colId = -1, colDate = 0;
      for (var c = 0; c < headers.length; c++) {
        var hc = headers[c];
        if (hc.indexOf('name') !== -1 || hc.indexOf('नाम') !== -1) colName = c;
        else if (hc.indexOf('phone') !== -1 || hc.indexOf('mobile') !== -1 || hc.indexOf('फ़ोन') !== -1 || hc.indexOf('फोन') !== -1) colPhone = c;
        else if (hc.indexOf('state') !== -1 || hc.indexOf('राज्य') !== -1) colState = c;
        else if (hc.indexOf('vow') !== -1 || hc.indexOf('focus') !== -1 || hc.indexOf('संकल्प') !== -1) colVow = c;
        else if (hc.indexOf('email') !== -1 || hc.indexOf('ईमेल') !== -1) colEmail = c;
        else if (hc.indexOf('photo') !== -1 || hc.indexOf('फोटो') !== -1) colPhoto = c;
        else if (hc.indexOf('registry') !== -1 || hc.indexOf('id') !== -1 || hc.indexOf('hash') !== -1) colId = c;
      }

      // Search matching row (from newest to oldest)
      for (var r = data.length - 1; r >= 0; r--) {
        var row = data[r];
        var rowPhone = (colPhone >= 0 && row[colPhone]) ? row[colPhone].toString().replace(/[^0-9]/g, '') : '';
        var rowId = (colId >= 0 && row[colId]) ? row[colId].toString().toLowerCase() : ('sb-2047-' + (baseCount + r + 1));
        var cleanQueryNum = query.replace(/[^0-9]/g, '');

        var matched = false;
        if (cleanQueryNum.length >= 6 && rowPhone.indexOf(cleanQueryNum) !== -1) {
          matched = true;
        } else if (rowId.indexOf(query) !== -1) {
          matched = true;
        }

        if (matched) {
          return ContentService
            .createTextOutput(JSON.stringify({
              status: "success",
              found: true,
              record: {
                fullName: colName >= 0 ? row[colName] : '',
                phone: colPhone >= 0 ? row[colPhone] : '',
                state: colState >= 0 ? row[colState] : '',
                vow: colVow >= 0 ? row[colVow] : '',
                email: colEmail >= 0 ? row[colEmail] : '',
                photoUrl: colPhoto >= 0 ? row[colPhoto] : '',
                pledgeId: colId >= 0 ? row[colId] : ('SB-2047-' + (baseCount + r + 1)),
                timestamp: row[colDate] ? row[colDate].toString() : ''
              }
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", found: false, message: "No matching pledge found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Extract recent submissions (last 15 rows, privacy-safe: NO phone, NO email)
    var recent = [];
    if (lastRow > 1) {
      var numRows = Math.min(15, lastRow - 1);
      var startRow = Math.max(2, lastRow - numRows + 1);
      var rangeData = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
      var sheetHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
        return h ? h.toString().toLowerCase().trim() : '';
      });

      var cName = -1, cState = -1, cVow = -1, cId = -1, cDate = 0;
      for (var hcIdx = 0; hcIdx < sheetHeaders.length; hcIdx++) {
        var hdr = sheetHeaders[hcIdx];
        if (hdr.indexOf('name') !== -1 || hdr.indexOf('नाम') !== -1) cName = hcIdx;
        else if (hdr.indexOf('state') !== -1 || hdr.indexOf('राज्य') !== -1) cState = hcIdx;
        else if (hdr.indexOf('vow') !== -1 || hdr.indexOf('focus') !== -1 || hdr.indexOf('संकल्प') !== -1) cVow = hcIdx;
        else if (hdr.indexOf('registry') !== -1 || hdr.indexOf('id') !== -1 || hdr.indexOf('hash') !== -1) cId = hcIdx;
      }

      for (var rIdx = rangeData.length - 1; rIdx >= 0; rIdx--) {
        var rData = rangeData[rIdx];
        var cFullName = cName >= 0 && rData[cName] ? rData[cName].toString().trim() : '';
        if (cFullName) {
          recent.push({
            name: cFullName,
            state: cState >= 0 && rData[cState] ? rData[cState].toString().trim() : 'Bharat',
            vow: cVow >= 0 && rData[cVow] ? rData[cVow].toString().trim() : 'Kartavya & Civic Duty',
            pledgeId: cId >= 0 && rData[cId] ? rData[cId].toString().trim() : ('SB-2047-' + (baseCount + startRow + rIdx - 1)),
            timestamp: rData[cDate] ? rData[cDate].toString() : ''
          });
        }
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        count: totalCount,
        submissions: rowCount,
        recent: recent,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", count: 125, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
