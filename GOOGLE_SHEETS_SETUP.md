# 🇮🇳 Swarnim Bharat Udayghosh - Google Sheets Live Data Setup Guide

Ye guide aapko 3 minute me aapki Google Sheet ko website ke sath connect karna sikhati hai, taaki jo bhi citizen form bhare, uska data seedha aapki Google Sheet me store ho aur website par live number aage badhe.

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
   - **Description:** `Swarnim Bharat Live Webhook`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(Ise zaroor 'Anyone' rakhein taaki koi bhi citizen bina login kiye form submit kar sake)*
4. **Deploy** button click karein.
5. Google aapse access permission maang sakta hai:
   - *Authorize Access* par click karein.
   - Apna Google Account chunein.
   - *Advanced* par click karein aur *"Go to Untitled project (unsafe)"* select karein.
   - *Allow* par click karein.
6. Aapko ek **Web app URL** milega (jaise `https://script.google.com/macros/s/AKfycbx.../exec`).
   - Is URL ko **Copy** kar lein.

---

### Step 4: Website me URL Paste Karein
1. `index.html` file kholein.
2. Line 438 ke paas dekhein:
   ```javascript
   const GOOGLE_SHEETS_WEBHOOK_URL = 'YAHAN_APNA_URL_PASTE_KAREIN';
   ```
3. Khali quotes me apna copy kiya hua URL paste kar dein.
4. File save karke git push kar dein:
   ```bash
   git add index.html
   git commit -m "Connect live Google Sheets webhook"
   git push origin main
   ```

---

### ✅ Ready! Test Kaise Karein?
1. Website par jayein aur form me apna naam aur state daal kar **"Affirm & Generate Sovereign Certificate"** dabayein.
2. Apni Google Sheet kholein — aapko turant new row dikhegi:
   | Timestamp | Full Name | State | Sankalp Focus | Pledge ID |
   |---|---|---|---|---|
   | 09-Nov-2026 05:45:00 PM | Aarav Sharma | Delhi NCR | Prakriti & Green Energy | SB-2047-1430494 |
3. Website par counter automatic `14,30,494` ho jayega!
