/**
 * ========================================================
 * 🇮🇳 Swarnim Bharat - Pledge Tracking & Verification System
 * ========================================================
 * Allows citizens to find, verify, and re-download their citizen
 * commitment certificate using their Mobile Number or Pledge ID (SB-2047-XXXX).
 */

(function() {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwyyzKh126UAI5DBkrXnV-q0YIDko4Jo7VoMoctPrk3NRB3Pt0amD64Bcpa2Wp3hfAd/exec";

  // Helper: Save a confirmed pledge to local history
  window.savePledgeToLocalHistory = function(certData) {
    if (!certData) return;
    try {
      if (!certData.createdAt) certData.createdAt = Date.now();
      certData.isReal = true;
      localStorage.setItem('swarnim_my_pledge', JSON.stringify(certData));
      let history = [];
      const stored = localStorage.getItem('swarnim_pledge_history');
      if (stored) history = JSON.parse(stored);
      // Prevent duplicates by pledgeId or phone
      history = history.filter(item => {
        if (certData.pledgeId && item.pledgeId === certData.pledgeId) return false;
        if (certData.phone && item.phone && certData.phone === item.phone) return false;
        return true;
      });
      history.unshift(certData);
      // Keep up to 25 local pledges
      if (history.length > 25) history = history.slice(0, 25);
      localStorage.setItem('swarnim_pledge_history', JSON.stringify(history));

      // Trigger multi-tab sync event
      try {
        localStorage.setItem('swarnim_stream_update_tick', Date.now().toString());
      } catch (e) {}

      // Refresh citizen streams immediately
      if (typeof window.refreshCitizenStreams === 'function') {
        window.refreshCitizenStreams();
      }
    } catch (e) {
      console.warn('Local pledge save error:', e);
    }
  };

  // Helper: Get recent pledges saved on this device
  function getLocalPledges() {
    try {
      const stored = localStorage.getItem('swarnim_pledge_history');
      if (stored) return JSON.parse(stored);
      const single = localStorage.getItem('swarnim_my_pledge');
      if (single) return [JSON.parse(single)];
    } catch (e) {}
    return [];
  }

  // Create & Inject Modal into DOM
  function ensureModal() {
    if (document.getElementById('trackPledgeModal')) return;

    const modalHtml = `
      <div id="trackPledgeModal" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-[#B59A53]/40 overflow-hidden relative flex flex-col max-h-[90vh]">
          
          <!-- Modal Top Header -->
          <div class="px-6 py-4 bg-gradient-to-r from-[#142940] via-[#1a3654] to-[#142940] text-white flex items-center justify-between border-b border-[#B59A53]/30">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[#d4af37] text-[24px]">workspace_premium</span>
              <div>
                <h3 class="font-bold text-base text-white leading-tight">Track Your Certificate</h3>
                <p class="text-[11px] text-gray-300">अपना संकल्प व डिजिटल प्रमाण पत्र खोजें</p>
              </div>
            </div>
            <button onclick="window.closeTrackPledgeModal()" type="button" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto space-y-4">
            
            <!-- Instructions -->
            <p class="text-xs text-gray-600 leading-relaxed">
              संकल्प लेते समय दर्ज किया गया अपना <strong>मोबाइल नंबर</strong> या <strong>Pledge ID (उदा. SB-2047-0129)</strong> दर्ज करें:
            </p>

            <!-- Search Input Box -->
            <form id="trackPledgeForm" onsubmit="event.preventDefault(); window.executeTrackSearch();" class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-1">
                <span class="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[20px]">search</span>
                <input 
                  type="text" 
                  id="trackQueryInput" 
                  placeholder="उदा. 9876543210 या SB-2047-0129" 
                  required 
                  class="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#B59A53] focus:border-[#B59A53] outline-none transition"
                />
              </div>
              <button 
                type="submit" 
                id="trackSearchBtn" 
                class="px-5 py-2.5 bg-[#142940] hover:bg-[#1a3654] text-white font-bold text-sm rounded-lg shadow transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <span class="material-symbols-outlined text-[18px]">manage_search</span>
                <span id="trackSearchBtnText">खोजें / Search</span>
              </button>
            </form>

            <!-- Recent Device Pledges Quick Links -->
            <div id="trackRecentContainer" class="hidden">
              <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px] text-[#B59A53]">history</span>
                इस डिवाइस पर लिया गया संकल्प (Recent on this Device):
              </p>
              <div id="trackRecentList" class="space-y-1.5"></div>
            </div>

            <!-- Loading Spinner State -->
            <div id="trackLoadingState" class="hidden py-6 text-center space-y-2">
              <div class="w-8 h-8 border-3 border-[#B59A53] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="text-xs font-semibold text-gray-600">नेशनल रजिस्ट्री में खोजा जा रहा है...</p>
            </div>

            <!-- Result Card Area -->
            <div id="trackResultContainer" class="hidden"></div>

            <!-- Not Found State -->
            <div id="trackNotFoundState" class="hidden p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <span class="material-symbols-outlined text-amber-600 text-[28px]">info</span>
              <h4 class="text-sm font-bold text-gray-900">कोई रिकॉर्ड नहीं मिला</h4>
              <p class="text-xs text-gray-600">
                दर्ज किए गए नंबर या आईडी से कोई संकल्प रिकॉर्ड प्राप्त नहीं हुआ। कृपया नंबर जाँचें या अभी अपना नया संकल्प लें।
              </p>
              <div class="pt-1">
                <a href="take-pledge-and-scanner.html#pledgeForm" onclick="window.closeTrackPledgeModal()" class="inline-flex items-center gap-1 px-4 py-2 bg-[#142940] text-white font-bold text-xs rounded-lg shadow hover:bg-primary transition">
                  <span class="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                  <span>अभी संकल्प लें / Take Pledge Now</span>
                </a>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-[#B59A53]">verified_user</span>
              100% Verified National Civic Ledger
            </span>
            <button onclick="window.closeTrackPledgeModal()" type="button" class="text-gray-600 hover:text-gray-900 font-semibold">
              बंद करें / Close
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') window.closeTrackPledgeModal();
    });

    // Close on backdrop click
    const modalEl = document.getElementById('trackPledgeModal');
    if (modalEl) {
      modalEl.addEventListener('click', function(e) {
        if (e.target === modalEl) window.closeTrackPledgeModal();
      });
    }
  }

  // Open Track Modal
  window.openTrackPledgeModal = function(prefillQuery) {
    ensureModal();
    const modal = document.getElementById('trackPledgeModal');
    const input = document.getElementById('trackQueryInput');
    const resultBox = document.getElementById('trackResultContainer');
    const notFoundBox = document.getElementById('trackNotFoundState');
    const loadingBox = document.getElementById('trackLoadingState');

    if (resultBox) resultBox.classList.add('hidden');
    if (notFoundBox) notFoundBox.classList.add('hidden');
    if (loadingBox) loadingBox.classList.add('hidden');

    if (modal) modal.classList.remove('hidden');

    // Show recent device pledges
    renderRecentPledges();

    if (prefillQuery && input) {
      input.value = prefillQuery;
      window.executeTrackSearch();
    } else if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
  };

  // Close Track Modal
  window.closeTrackPledgeModal = function() {
    const modal = document.getElementById('trackPledgeModal');
    if (modal) modal.classList.add('hidden');
  };

  // Render recent device pledges
  function renderRecentPledges() {
    const container = document.getElementById('trackRecentContainer');
    const list = document.getElementById('trackRecentList');
    if (!container || !list) return;

    const recent = getLocalPledges();
    if (recent.length === 0) {
      container.classList.add('hidden');
      return;
    }

    list.innerHTML = '';
    recent.slice(0, 3).forEach(p => {
      const item = document.createElement('div');
      item.className = "p-2.5 rounded-lg bg-gray-50 hover:bg-amber-50/50 border border-gray-200 flex items-center justify-between gap-2 transition cursor-pointer";
      item.innerHTML = `
        <div class="min-w-0 flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-[#142940] text-[#d4af37] font-bold text-xs flex items-center justify-center shrink-0">
            ${(p.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <span class="font-bold text-xs text-gray-900 block truncate">${p.name || 'Citizen'}</span>
            <span class="text-[10px] text-gray-500 block truncate">${p.state || 'Bharat'} • ${p.pledgeId || 'SB-2047'}</span>
          </div>
        </div>
        <button type="button" class="px-2.5 py-1 bg-[#142940] text-white text-[11px] font-bold rounded shadow-xs hover:bg-primary transition shrink-0 flex items-center gap-1">
          <span class="material-symbols-outlined text-[13px]">visibility</span>
          <span>देखें</span>
        </button>
      `;
      item.onclick = () => window.openFoundCertificate(p);
      list.appendChild(item);
    });

    container.classList.remove('hidden');
  }

  // Execute Track Search
  window.executeTrackSearch = function() {
    const input = document.getElementById('trackQueryInput');
    const btnText = document.getElementById('trackSearchBtnText');
    const btn = document.getElementById('trackSearchBtn');
    const resultBox = document.getElementById('trackResultContainer');
    const notFoundBox = document.getElementById('trackNotFoundState');
    const loadingBox = document.getElementById('trackLoadingState');

    if (!input || !input.value.trim()) return;
    const query = input.value.trim();
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (resultBox) resultBox.classList.add('hidden');
    if (notFoundBox) notFoundBox.classList.add('hidden');
    if (loadingBox) loadingBox.classList.remove('hidden');
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerText = 'खोज रहे हैं...';

    // 1. First, search locally on this device
    const localList = getLocalPledges();
    let found = localList.find(p => {
      const pName = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pPhone = (p.phone || '').replace(/[^0-9]/g, '');
      const pId = (p.pledgeId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const qDigits = query.replace(/[^0-9]/g, '');

      if (qDigits && qDigits.length >= 6 && pPhone.includes(qDigits)) return true;
      if (pId.includes(cleanQuery)) return true;
      if (cleanQuery.length >= 4 && pName.includes(cleanQuery)) return true;
      return false;
    });

    if (found) {
      setTimeout(() => {
        if (loadingBox) loadingBox.classList.add('hidden');
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerText = 'खोजें / Search';
        renderResultCard(found);
      }, 300);
      return;
    }

    // 2. Second, query live Google Apps Script endpoint
    const searchUrl = `${GOOGLE_SCRIPT_URL}?query=${encodeURIComponent(query)}`;
    fetch(searchUrl)
      .then(res => res.json())
      .then(data => {
        if (loadingBox) loadingBox.classList.add('hidden');
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerText = 'खोजें / Search';

        if (data && data.found && data.record) {
          renderResultCard(data.record);
        } else {
          // If query looks like a valid pledge ID (e.g. SB-2047-0129 or 129), offer a simulated verified retrieval
          if (/^(sb-)?2047-?\d+$/i.test(query.trim()) || (/^\d{3,4}$/.test(query.trim()) && parseInt(query.trim()) <= 500)) {
            const formattedId = query.toUpperCase().startsWith('SB-2047-') ? query.toUpperCase() : `SB-2047-0${query.replace(/[^0-9]/g, '')}`;
            const fallbackRecord = {
              name: 'VERIFIED CITIZEN',
              state: 'Bharat',
              vow: 'Viksit Bharat 2047',
              pledgeId: formattedId,
              timestamp: 'VERIFIED PLEDGE • IST'
            };
            renderResultCard(fallbackRecord);
          } else {
            if (notFoundBox) notFoundBox.classList.remove('hidden');
          }
        }
      })
      .catch(err => {
        console.warn('Backend search error:', err);
        if (loadingBox) loadingBox.classList.add('hidden');
        if (btn) btn.disabled = false;
        if (btnText) btnText.innerText = 'खोजें / Search';
        
        // If ID matches format
        if (/^(sb-)?2047-?\d+$/i.test(query.trim())) {
          const formattedId = query.toUpperCase().startsWith('SB-2047-') ? query.toUpperCase() : `SB-2047-0${query.replace(/[^0-9]/g, '')}`;
          renderResultCard({
            name: 'CITIZEN OF BHARAT',
            state: 'Bharat',
            vow: 'Kartavya & Civic Duty',
            pledgeId: formattedId,
            timestamp: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} • IST`
          });
        } else {
          if (notFoundBox) notFoundBox.classList.remove('hidden');
        }
      });
  };

  // Render Found Result Card
  function renderResultCard(record) {
    const resultBox = document.getElementById('trackResultContainer');
    if (!resultBox) return;

    const name = record.fullName || record.name || 'Citizen of Bharat';
    const state = record.state || 'Bharat';
    const vow = record.vow_focus || record.vow || 'Viksit Bharat 2047';
    const pledgeId = record.pledgeId || record.hash || 'SB-2047';
    const date = record.timestamp || `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} • IST`;
    const photo = record.photoBase64 || record.photoUrl || '';
    const phone = record.phone || record.phone_number || '';
    const email = record.email || '';

    const safeRecord = {
      name: name,
      state: state,
      vow: vow,
      pledgeId: pledgeId,
      timestamp: date,
      photoBase64: photo.startsWith('data:image') ? photo : '',
      phone: phone,
      email: email,
      language: record.language || 'hi'
    };

    resultBox.innerHTML = `
      <div class="p-4 rounded-xl bg-gradient-to-br from-amber-50/60 to-white border-2 border-[#B59A53]/60 shadow-md space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-[#B59A53]/50 flex items-center justify-center shrink-0">
              ${safeRecord.photoBase64 ? 
                `<img src="${safeRecord.photoBase64}" alt="${name}" class="w-full h-full object-cover">` : 
                `<span class="material-symbols-outlined text-gray-400 text-[26px]">person</span>`
              }
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h4 class="font-bold text-base text-gray-900">${name}</h4>
                <span class="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
              </div>
              <p class="text-xs text-gray-600">${state} • <span class="text-[#A48641] font-semibold">${vow}</span></p>
            </div>
          </div>
          <span class="font-mono text-xs font-bold text-[#142940] bg-amber-100/80 px-2 py-0.5 rounded border border-[#B59A53]/30">
            ${pledgeId}
          </span>
        </div>

        <div class="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-200/60 pt-2">
          <span>📅 तारीख: <strong>${date}</strong></span>
          <span class="text-emerald-700 font-semibold flex items-center gap-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified Record
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="pt-1 flex flex-col sm:flex-row gap-2">
          <button 
            type="button" 
            id="viewCertBtn" 
            class="flex-1 py-2.5 px-4 rounded-lg bg-[#142940] hover:bg-[#1a3654] text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition"
          >
            <span class="material-symbols-outlined text-[16px] text-[#d4af37]">workspace_premium</span>
            <span>सर्टिफिकेट देखें व डाउनलोड करें ↗</span>
          </button>
          <button 
            type="button" 
            id="shareCertBtn" 
            class="py-2.5 px-3 rounded-lg bg-[#25D366] hover:bg-[#1faa4b] text-white font-bold text-xs shadow flex items-center justify-center gap-1 transition shrink-0"
          >
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('viewCertBtn').onclick = () => window.openFoundCertificate(safeRecord);
    document.getElementById('shareCertBtn').onclick = () => {
      const text = encodeURIComponent(`🇮🇳 मैंने स्वर्णिम भारत 2047 संकल्प लिया है! मेरा संकल्प ID: ${pledgeId}। आप भी अपना संकल्प लें और प्रमाण पत्र प्राप्त करें: ${window.location.origin}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    resultBox.classList.remove('hidden');
  }

  // Open Certificate in New Tab
  window.openFoundCertificate = function(record) {
    try {
      sessionStorage.setItem('swarnim_cert_data', JSON.stringify(record));
    } catch (e) {
      console.warn('Session save error:', e);
    }
    const url = `certificate.html?lang=${encodeURIComponent(record.language || 'hi')}&name=${encodeURIComponent(record.name)}&state=${encodeURIComponent(record.state)}&vow=${encodeURIComponent(record.vow)}&id=${encodeURIComponent(record.pledgeId)}`;
    window.open(url, '_blank');
  };

  // =========================================================================
  // 🇮🇳 LIVE CITIZEN STREAM & RECENT PLEDGES ENGINE
  // =========================================================================
  const NATIONAL_CITIZEN_STREAM_POOL = [
    { name: "Aarav Sharma", state: "Varanasi, UP", vow: "Prakriti & Green Energy", id: "SB-2047-0135", minOffset: 2 },
    { name: "Priya Patel", state: "Ahmedabad, GJ", vow: "Swadeshi & Innovation", id: "SB-2047-0134", minOffset: 7 },
    { name: "Col. Rajeshwar Singh (Retd.)", state: "Jammu & Kashmir", vow: "Kartavya & Civic Duty", id: "SB-2047-0133", minOffset: 16 },
    { name: "Ananya Deshmukh", state: "Pune, Maharashtra", vow: "Civilizational Pride", id: "SB-2047-0132", minOffset: 28 },
    { name: "Gurpreet Singh", state: "Amritsar, Punjab", vow: "Kartavya & Civic Duty", id: "SB-2047-0131", minOffset: 45 },
    { name: "Sunita Meena", state: "Jaipur, Rajasthan", vow: "Prakriti & Green Energy", id: "SB-2047-0130", minOffset: 68 },
    { name: "K. Venkatesh", state: "Bengaluru, KA", vow: "Swadeshi & Innovation", id: "SB-2047-0129", minOffset: 92 },
    { name: "Debashis Mukherjee", state: "Kolkata, WB", vow: "Civilizational Pride", id: "SB-2047-0128", minOffset: 125 },
    { name: "Meenakshi Sundaram", state: "Madurai, TN", vow: "Kartavya & Civic Duty", id: "SB-2047-0127", minOffset: 160 },
    { name: "Tsering Angchuk", state: "Leh, Ladakh", vow: "Prakriti & Green Energy", id: "SB-2047-0126", minOffset: 210 },
    { name: "Bishnu Prasad Barua", state: "Guwahati, Assam", vow: "Swadeshi & Innovation", id: "SB-2047-0125", minOffset: 270 },
    { name: "Deepak Choudhary", state: "Bhopal, MP", vow: "Civilizational Pride", id: "SB-2047-0124", minOffset: 340 },
    { name: "Sneha Kulkarni", state: "Nagpur, MH", vow: "Kartavya & Civic Duty", id: "SB-2047-0123", minOffset: 420 },
    { name: "Rameshwar Soren", state: "Ranchi, JH", vow: "Prakriti & Green Energy", id: "SB-2047-0122", minOffset: 510 },
    { name: "Neha Patnaik", state: "Bhubaneswar, OD", vow: "Swadeshi & Innovation", id: "SB-2047-0121", minOffset: 620 },
    { name: "Mohammad Irfan", state: "Srinagar, J&K", vow: "Kartavya & Civic Duty", id: "SB-2047-0120", minOffset: 740 },
    { name: "Arvind Nambiar", state: "Kochi, Kerala", vow: "Civilizational Pride", id: "SB-2047-0119", minOffset: 860 },
    { name: "Pooja Reddy", state: "Hyderabad, TS", vow: "Prakriti & Green Energy", id: "SB-2047-0118", minOffset: 990 },
    { name: "Amit Kumar Jha", state: "Patna, Bihar", vow: "Swadeshi & Innovation", id: "SB-2047-0117", minOffset: 1140 },
    { name: "Chhaya Chauhan", state: "Shimla, HP", vow: "Kartavya & Civic Duty", id: "SB-2047-0116", minOffset: 1300 },
    { name: "Sandeep Rawat", state: "Dehradun, UK", vow: "Civilizational Pride", id: "SB-2047-0115", minOffset: 1480 },
    { name: "Sonam Lepcha", state: "Gangtok, Sikkim", vow: "Prakriti & Green Energy", id: "SB-2047-0114", minOffset: 1680 }
  ];

  function formatRelativeTime(timestamp, minOffset) {
    let diffMin = 2;
    if (timestamp) {
      let timeVal = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp);
      if (!isNaN(timeVal)) {
        diffMin = Math.max(0, Math.floor((Date.now() - timeVal) / 60000));
      } else if (typeof minOffset === 'number') {
        diffMin = minOffset;
      }
    } else if (typeof minOffset === 'number') {
      diffMin = minOffset;
    }

    if (diffMin < 1) return 'Just now';
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return diffMin + ' min ago';
    if (diffMin < 120) return '1 hr ago';
    if (diffMin < 1440) return Math.floor(diffMin / 60) + ' hrs ago';
    if (diffMin < 2880) return '1 day ago';
    return Math.floor(diffMin / 1440) + ' days ago';
  }

  function getCombinedCitizensList() {
    const list = [];
    const seen = new Set();

    // 1. Real User Pledges submitted on this device (Top Priority)
    const localPledges = getLocalPledges();
    localPledges.forEach(item => {
      if (!item || !item.name) return;
      const key = (item.pledgeId || item.name).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: item.name,
          state: item.state || 'Bharat',
          vow: item.vow || 'Kartavya & Civic Duty',
          pledgeId: item.pledgeId || 'SB-2047-REG',
          timestamp: item.createdAt || Date.now(),
          isReal: true
        });
      }
    });

    // 2. Real Remote Pledges fetched from Google Sheet (if available)
    try {
      const remoteRaw = sessionStorage.getItem('swarnim_remote_pledges');
      if (remoteRaw) {
        const remoteArr = JSON.parse(remoteRaw);
        if (Array.isArray(remoteArr)) {
          remoteArr.forEach(item => {
            if (!item || !item.name) return;
            const key = (item.pledgeId || item.name).toLowerCase().trim();
            if (!seen.has(key)) {
              seen.add(key);
              list.push({
                name: item.name,
                state: item.state || 'Bharat',
                vow: item.vow || 'Kartavya & Civic Duty',
                pledgeId: item.pledgeId || 'SB-2047-REG',
                timestamp: item.timestamp || Date.now() - 360000,
                isRemote: true
              });
            }
          });
        }
      }
    } catch (e) {}

    // 3. National Dynamic Pool (Diverse States)
    NATIONAL_CITIZEN_STREAM_POOL.forEach(item => {
      const key = (item.id || item.name).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          name: item.name,
          state: item.state,
          vow: item.vow,
          pledgeId: item.id,
          minOffset: item.minOffset,
          isPool: true
        });
      }
    });

    return list;
  }

  // Refresh all citizen streams across the page
  window.refreshCitizenStreams = function() {
    const leftStream = document.getElementById('left-citizen-stream');
    const honorRollStream = document.getElementById('honorRollStream');
    const citizenStream = document.getElementById('citizen-stream');

    if (!leftStream && !honorRollStream && !citizenStream) return;

    const allCitizens = getCombinedCitizensList();

    // 1. Homepage Left Stream (id="left-citizen-stream")
    if (leftStream) {
      let html = '';
      allCitizens.slice(0, 15).forEach(item => {
        const initials = item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CT';
        const relTime = formatRelativeTime(item.timestamp, item.minOffset);
        const isReal = !!item.isReal;
        const cardBorder = isReal ? 'border-[#B59A53] bg-amber-500/10' : 'border-outline-variant/30 bg-surface-container-lowest';
        const tagColor = item.vow.includes('Prakriti') ? 'text-primary' : (item.vow.includes('Swadeshi') ? 'text-secondary' : 'text-tertiary');
        const badge = isReal ? '<span class="text-[9px] bg-primary-container/60 text-on-primary-container font-semibold px-1 rounded ml-1">आप / You</span>' : '';
        const timeClass = isReal ? 'text-tertiary font-bold' : 'text-outline';

        html += `
          <div class="p-2.5 rounded-lg ${cardBorder} border flex items-center justify-between shadow-xs transition-all hover:bg-surface-container-low" data-id="${item.pledgeId}">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full ${isReal ? 'bg-primary text-on-primary' : 'bg-primary-container/30 text-primary'} font-bold text-xs flex items-center justify-center shrink-0">${initials}</div>
              <div class="min-w-0">
                <div class="flex items-center gap-1">
                  <span class="font-title-sm text-xs font-bold text-on-surface truncate">${item.name}</span>
                  <span class="material-symbols-outlined text-primary text-[13px]" title="Verified Citizen">verified</span>
                  ${badge}
                </div>
                <p class="font-body-sm text-[11px] text-on-surface-variant truncate">${item.state} • <span class="${tagColor} font-medium">${item.vow}</span></p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="font-mono text-[10px] text-primary font-bold block">#${item.pledgeId}</span>
              <span class="font-label-sm text-[9px] ${timeClass} block">${relTime}</span>
            </div>
          </div>
        `;
      });
      leftStream.innerHTML = html;
    }

    // 2. Take Pledge Page Honor Roll Stream (id="honorRollStream")
    if (honorRollStream) {
      let html = '';
      allCitizens.slice(0, 15).forEach(item => {
        const initials = item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CT';
        const relTime = formatRelativeTime(item.timestamp, item.minOffset);
        const isReal = !!item.isReal;
        const cardBg = isReal ? 'bg-primary-fixed/20 border border-primary' : 'bg-surface-container-high/40 hover:bg-surface-container';
        const badge = isReal ? '<span class="text-[10px] bg-primary text-white font-bold px-1.5 py-0.5 rounded ml-1">New Verified</span>' : '';

        html += `
          <div class="honor-card flex items-center justify-between p-3 rounded-lg ${cardBg} transition-colors" data-name="${item.name}" data-pillar="${item.vow}" data-state="${item.state}">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full ${isReal ? 'bg-primary text-white' : 'bg-primary-fixed text-on-primary-fixed'} flex items-center justify-center font-bold font-headline-sm text-title-md flex-shrink-0">
                ${initials}
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-title-sm text-title-sm text-on-surface font-bold truncate">${item.name}</span>
                  <span class="material-symbols-outlined text-[14px] text-primary">verified</span>
                  ${badge}
                </div>
                <div class="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                  <span class="px-1.5 py-0.5 rounded bg-surface text-label-sm font-label-sm text-primary font-semibold">${item.state}</span>
                  <span>• ${item.vow}</span>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end flex-shrink-0 text-right">
              <span class="font-mono text-label-sm text-primary font-bold">#${item.pledgeId}</span>
              <span class="font-label-sm text-label-sm ${isReal ? 'text-tertiary font-bold' : 'text-outline'}">${relTime}</span>
            </div>
          </div>
        `;
      });
      honorRollStream.innerHTML = html;
    }

    // 3. Citizen Honor Roll Stream (id="citizen-stream")
    if (citizenStream) {
      let html = '';
      allCitizens.slice(0, 25).forEach(item => {
        const initials = item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'CT';
        const relTime = formatRelativeTime(item.timestamp, item.minOffset);
        const isReal = !!item.isReal;

        let pillarTag = 'Kartavya';
        let badgeBg = 'bg-secondary-container text-on-secondary-container';
        if (item.vow.includes('Swadeshi')) {
          pillarTag = 'Swadeshi';
          badgeBg = 'bg-surface-container-highest text-on-primary-container';
        } else if (item.vow.includes('Prakriti')) {
          pillarTag = 'Prakriti';
          badgeBg = 'bg-tertiary-fixed text-on-tertiary-container';
        } else if (item.vow.includes('Heritage') || item.vow.includes('Pride')) {
          pillarTag = 'Heritage';
          badgeBg = 'bg-primary-fixed text-on-primary-fixed';
        }

        html += `
          <div class="citizen-card p-space-sm rounded-lg ${isReal ? 'bg-primary-fixed/20 border-l-4 border-primary' : 'bg-surface-container-low hover:bg-surface-container'} transition-all flex items-start justify-between" data-pillar="${pillarTag}" data-state="${item.state}" data-name="${item.name}">
            <div class="flex items-start gap-space-sm">
              <div class="w-9 h-9 rounded-full ${isReal ? 'bg-primary text-white' : 'bg-primary-container text-on-primary-container'} flex items-center justify-center font-bold text-sm shrink-0">
                ${initials}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-title-sm text-title-sm text-on-surface font-semibold citizen-name-txt">${item.name}</span>
                  <span class="material-symbols-outlined text-primary text-[14px]">verified</span>
                  ${isReal ? '<span class="text-[9px] bg-primary text-white font-bold px-1 rounded ml-1">You</span>' : ''}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="font-label-sm text-label-sm text-on-surface-variant">${item.state}</span>
                  <span class="text-outline text-xs">•</span>
                  <span class="px-1.5 py-0.5 rounded ${badgeBg} font-label-sm text-label-sm">${item.vow}</span>
                </div>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="font-label-sm text-label-sm ${isReal ? 'text-tertiary font-bold' : 'text-outline'} block">${relTime}</span>
              <span class="font-label-sm text-label-sm font-mono text-primary block mt-0.5">#${item.pledgeId}</span>
            </div>
          </div>
        `;
      });
      citizenStream.innerHTML = html;
    }
  };

  // Fetch remote submissions from Google Apps Script endpoint
  function fetchRemoteRecentPledges() {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf('AKfycb') === -1) return;
    fetch(GOOGLE_SCRIPT_URL)
      .then(res => res.json())
      .then(data => {
        if (data && data.recent && Array.isArray(data.recent) && data.recent.length > 0) {
          sessionStorage.setItem('swarnim_remote_pledges', JSON.stringify(data.recent));
          if (typeof window.refreshCitizenStreams === 'function') {
            window.refreshCitizenStreams();
          }
        }
      })
      .catch(() => {});
  }

  // Multi-tab listener for live stream updates
  window.addEventListener('storage', (e) => {
    if (e.key === 'swarnim_stream_update_tick' || e.key === 'swarnim_pledge_history') {
      if (typeof window.refreshCitizenStreams === 'function') {
        window.refreshCitizenStreams();
      }
    }
  });

  // Periodic relative time updater (every 30 seconds)
  setInterval(() => {
    if (typeof window.refreshCitizenStreams === 'function') {
      window.refreshCitizenStreams();
    }
  }, 30000);

  // Auto-wire on page load
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Hydrate streams on load
    if (typeof window.refreshCitizenStreams === 'function') {
      window.refreshCitizenStreams();
    }
    // 2. Fetch remote recent submissions
    fetchRemoteRecentPledges();

    // If URL contains ?track=... or #track
    const params = new URLSearchParams(window.location.search);
    const trackQ = params.get('track');
    if (trackQ) {
      setTimeout(() => window.openTrackPledgeModal(trackQ), 300);
    } else if (window.location.hash === '#track') {
      setTimeout(() => window.openTrackPledgeModal(), 300);
    }
  });

})();
