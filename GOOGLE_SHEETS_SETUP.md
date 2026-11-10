# 🇮🇳 Swarnim Bharat Udayghosh - Google Sheets & Drive Photo Live Setup Guide

Ye guide aapko 3 minute me aapki Google Sheet aur Google Drive ko website ke sath connect karna sikhati hai, taaki jo bhi citizen form bhare:
1. Unka **Naam, State, Vow, aur Email** seedha aapki Google Sheet me new row ban kar save ho.
2. Unki **Photo / Selfie** seedha aapke **Google Drive** me store ho aur uska clickable link Google Sheet me jud jaye.
3. Website par live counter number **14,29,876** aage badhe.

---

### Step 1: Nayi Google Sheet Banayein
1. Apne browser me **[sheets.google.com](https://sheets.google.com)** kholein.
2. Ek nayi **Blank spreadsheet** banayein.
3. Spreadsheet ka naam rakhein: `Swarnim Bharat Pledges`

---

### Step 2: Apps Script me Code Paste Karein
1. Google Sheet ke top menu me jayein: **Extensions > Apps Script**
2. Jo window khulegi, usme pehle se likha code (`function myFunction() { ... }`) delete kar dein.
3. Hamare project me se `assets/google-apps-script.js` ka pura code copy karein aur wahan paste kar dein.
4. Top menu me **Save** (💾 icon) dabayein.

---

### Step 3: Web App Deploy Karein (Zaroori Settings)
1. Top-right me blue **Deploy** button par click karein > **New deployment** chunein.
2. Left side me gear ⚙️ icon par click karke **Web app** select karein.
3. Form me ye bharein:
   - **Description:** `Swarnim Bharat Live Webhook with Photo`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(Ise zaroor 'Anyone' rakhein taaki koi bhi citizen bina login kiye form submit kar sake)*
4. **Deploy** button click karein.
5. Google aapse access permission maang sakta hai (Sheets aur Drive access):
   - *Authorize Access* par click karein.
   - Apna Google Account chunein.
   - *Advanced* par click karein aur *"Go to Untitled project (unsafe)"* select karein.
   - *Allow* par click karein.
6. Aapko ek **Web app URL** milega (jaise `https://script.google.com/macros/s/AKfycbx.../exec`).
   - Is URL ko **Copy** kar lein.

---

### Step 4: Website me URL Paste Karein
1. `index.html` file kholein.
2. Niche script me dekhein:
   ```javascript
   const GOOGLE_SCRIPT_URL = "यहाँ_अपना_WEB_APP_URL_पेस्ट_करें";
   ```
3. Quotes ke andar apna copy kiya hua URL paste kar dein:
   ```javascript
   const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYED_ID/exec";
   ```
4. File save karke git push kar dein:
   ```bash
   git add .
   git commit -m "Connect live Google Apps Script Webhook with photo support"
   git push origin main
   ```

---

### ✅ Ready! Test Kaise Karein?
1. Website par jayein aur form me apna naam, state, email daalein, apni photo select ya capture karein aur **"Affirm & Generate"** dabayein.
2. Apni Google Sheet kholein — aapko turant new row dikhegi:
   | Timestamp | Full Name | State | Vow Focus | Email | Citizen Photo | Pledge Registry ID |
   |---|---|---|---|---|---|---|
   | 10-Nov-2026 10:15:00 AM | Aarav Sharma | Delhi NCR | Prakriti & Green Energy | aarav@example.com | https://drive.google.com/file/d/... | SB-2047-1429877 |
3. Citizen Photo wale link par click karne se Google Drive me citizen ki uploaded photo khulegi!
4. Website par live counter automatic update ho jayega!
