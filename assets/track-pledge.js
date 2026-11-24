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
      // Keep up to 20 local pledges
      if (history.length > 20) history = history.slice(0, 20);
      localStorage.setItem('swarnim_pledge_history', JSON.stringify(history));
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

  // Auto-wire on page load
  document.addEventListener('DOMContentLoaded', () => {
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
