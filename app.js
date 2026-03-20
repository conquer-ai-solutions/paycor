/* ════════════════════════════════════════════════
   Paycor Document Collection POC — app.js
   MOCK DATA · No API required · Works offline
   Built from real deal data: Arctic Breeze Holdings LLC
   Conquer AI © 2026
════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════
// GLOBAL STATE — persists across screen navigation
// ═══════════════════════════════════════════════
const STATE = {
  currentScreen:      'screen-problem',
  bannerState:        'hidden',     // hidden | active | recovering | resolved
  arcticFixed:        false,
  clearwaterAccepted: false,
  dashAiAccepted:     false,
  acceptAiAccepted:   false,
  checklistGenerated: false,
  validationDone:     false,
  trackerAnalyzed:    false,
  validatorCountdownInterval: null,
  bannerInterval:     null,
  validatorStart:     null,
};

// ═══════════════════════════════════════════════
// SCREEN MAP
// ═══════════════════════════════════════════════
const SCREEN_TITLES = {
  'screen-problem':    'Problem Statement',
  'screen-dashboard':  'Deal Dashboard',
  'screen-checklist':  'Checklist Generator',
  'screen-validator':  'Document Validator',
  'screen-tracker':    'Multi-EIN Tracker',
  'screen-acceptance': 'Deal Acceptance',
};
const SCREEN_ORDER = ['screen-problem','screen-dashboard','screen-checklist','screen-validator','screen-tracker','screen-acceptance'];

// ═══════════════════════════════════════════════
// MOCK DATA — from real Arctic Breeze closing packet
// ═══════════════════════════════════════════════
const ARCTIC_BREEZE_WOTC = `Client Legal Name: Arctic Breeze Holdings LLC
Business Address: 15 Hargrove Ln UNIT 2C
City/State/ZIP: Palm Cost, FL 32137
NAISC/SIC: PERSONAL SERVICES
Total Employees: 45
Contact First Name: Ed Patrosso
Contact Phone Number: [BLANK]
Contact Email: epatrosso@tristatewater.com
Signature: [SIGNED — Ed Patrosso]
Title: CFO
Date: 2/2/2026
Services: WOTC Yes, Federal Disaster Credit Yes, Location Based Services Yes`;

const DOC_SCHEMAS = {
  wotc: {
    name: 'WOTC Agreement (Equifax)',
    required: [
      { field: 'Client Legal Name',       key: ['client legal name','client name'] },
      { field: 'Business Address',        key: ['business address','address'] },
      { field: 'City/State/ZIP',          key: ['city','state','zip'] },
      { field: 'NAISC/SIC Code',          key: ['naisc','sic'] },
      { field: 'Total Employees',         key: ['total employees','employees'] },
      { field: 'Contact First Name',      key: ['contact first name','first name'] },
      { field: 'Contact Phone Number',    key: ['contact phone','phone number','phone'] },
      { field: 'Contact Email',           key: ['contact email','email'] },
      { field: 'Signature',               key: ['signature','signed'] },
      { field: 'Signatory Title',         key: ['title'] },
      { field: 'Date Signed',             key: ['date'] },
    ],
    warning: 'DocuSign signature alone is NOT binding — client must also complete review at workforce.equifax.com/assets/paycor-wotc.pdf. This external step cannot be tracked via DocuSign.'
  },
  bank_auth: {
    name: 'Bank Authorization',
    required: [
      { field: 'Client Legal Name',      key: ['client legal name','client name'] },
      { field: 'FEIN',                   key: ['fein','ein','tax id'] },
      { field: 'Bank Name',              key: ['bank name','bank'] },
      { field: 'Routing Number (9 digits)', key: ['routing number','routing'] },
      { field: 'Account Number (DDA)',   key: ['account number','account'] },
      { field: 'Purposes checked',       key: ['purposes','autodebit','direct deposit'] },
      { field: 'Signatory Name',         key: ['name','signatory'] },
      { field: 'Signatory Title',        key: ['title'] },
      { field: 'Phone Number',           key: ['phone','telephone'] },
      { field: 'Date Signed',            key: ['date'] },
      { field: 'Cannabis declaration',   key: ['cannabis','not operating'] },
    ]
  },
  irs_8655: {
    name: 'IRS Form 8655',
    required: [
      { field: 'Taxpayer Legal Name',    key: ['taxpayer name','name'] },
      { field: 'EIN',                    key: ['ein','fein','employer identification'] },
      { field: 'Address',                key: ['address'] },
      { field: 'City/State/ZIP',         key: ['city','state','zip'] },
      { field: 'Contact Person',         key: ['contact person','contact'] },
      { field: 'Tax return types (940/941/943/944)', key: ['940','941','943','944','tax return'] },
      { field: 'Deposit auth start dates', key: ['deposit authorization','deposit auth'] },
      { field: 'W-2 disclosure year',    key: ['w-2','w2','disclosure'] },
      { field: 'Signature',              key: ['signature','signed'] },
      { field: 'Title',                  key: ['title'] },
      { field: 'Date',                   key: ['date'] },
    ]
  },
  state_poa: {
    name: 'State Power of Attorney',
    required: [
      { field: 'Taxpayer Name',                     key: ['taxpayer name','client name','name'] },
      { field: 'FEIN',                              key: ['fein','ein'] },
      { field: 'Address',                           key: ['address'] },
      { field: 'State Tax Registration Number',     key: ['tax registration','registration number','florida'] },
      { field: 'Representative Name (Paycor)',      key: ['representative','paycor'] },
      { field: 'Tax Type',                          key: ['tax type','reemployment','unemployment'] },
      { field: 'Taxpayer Signature',                key: ['signature','signed'] },
      { field: 'Date',                              key: ['date'] },
      { field: 'Paycor Representative Signature',   key: ['paycor signature','representative signature'] },
    ]
  },
  csa: {
    name: 'Order for Services (CSA)',
    required: [
      { field: 'Client Legal Name',                key: ['client legal name','client name'] },
      { field: 'Address',                          key: ['address'] },
      { field: 'Products listed',                  key: ['products','service','hcm','payroll'] },
      { field: 'Employee count',                   key: ['employees','employee count'] },
      { field: 'Pricing confirmed',                key: ['pricing','price','cost','$'] },
      { field: 'Signature',                        key: ['signature','signed'] },
      { field: 'Title',                            key: ['title'] },
      { field: 'Date',                             key: ['date'] },
      { field: 'Implementation Recovery Fee initials', key: ['implementation recovery','recovery fee','initials'] },
    ]
  },
  micr: {
    name: 'MICR Spec Sheet',
    required: [
      { field: 'Routing Transit Number',    key: ['routing transit','routing'] },
      { field: 'Account Number',            key: ['account number','account'] },
      { field: 'Financial Institution Name',key: ['financial institution','bank name','bank'] },
      { field: 'Account Type',              key: ['account type','business dda','personal dda'] },
      { field: 'Authorized Signature',      key: ['signature','authorized'] },
    ]
  }
};

const STATE_POA_MAP = {
  FL: 'Florida Power of Attorney (DR-835)',
  OH: 'Ohio Tax Agent Authorization',
  TX: 'Texas Workforce Commission POA',
  CA: 'California FTB 3520 + EDD DE 48',
  NY: 'New York State POA-1',
  IL: 'Illinois POA (IL-2848)',
  PA: 'Pennsylvania Power of Attorney',
  GA: 'Georgia POA (RD-1061)',
  NC: 'North Carolina GEN-58',
  VA: 'Virginia PAR 101',
  AZ: 'Arizona POA (AZ-285)',
  CO: 'Colorado DR 0145',
  NJ: 'New Jersey M-5008-R',
  MA: 'Massachusetts M-2848',
  WA: 'Washington State POA',
};

const PRODUCT_TRIGGERS = {
  wotc:       { name: 'WOTC Agreement (Equifax)', icon: '📜', type: 'third', tag: 'tag-third', note: '⚠️ Requires DocuSign + external Equifax URL completion. Phone number field commonly missed.' },
  ondemand:   { name: 'OnDemand Pay Agreement (PayActiv)', icon: '💳', type: 'third', tag: 'tag-third', note: 'Program Summary Form required. Third-party send to PayActiv.' },
  work_number:{ name: 'The Work Number Auth (TALX/Equifax)', icon: '✅', type: 'third', tag: 'tag-third', note: 'Covered in CSA signature — no separate form required.' },
};

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
function navigateTo(screenId) {
  if (screenId === STATE.currentScreen) return;
  const dur = 500;

  // Progress bar
  const bar = document.getElementById('progress-bar');
  bar.style.transition = `width ${dur}ms cubic-bezier(.4,0,.2,1)`;
  bar.style.width = '0%';
  bar.classList.add('running');
  requestAnimationFrame(() => { bar.style.width = '100%'; });

  setTimeout(() => {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Show target
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');

    // Update sidebar
    document.querySelectorAll('.sidebar-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === screenId);
    });

    // Update nav title
    const titleEl = document.getElementById('nav-screen-title');
    if (titleEl) titleEl.textContent = SCREEN_TITLES[screenId] || '';

    STATE.currentScreen = screenId;

    // Screen-specific on-enter logic
    onScreenEnter(screenId);

    // Fade out bar
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.style.width = '0%';
      bar.classList.remove('running');
      bar.style.opacity = '1';
      bar.style.transition = '';
    }, 250);
  }, dur * 0.6);
}

function onScreenEnter(screenId) {
  // Banner appears when navigating away from problem screen
  if (screenId !== 'screen-problem' && STATE.bannerState === 'hidden') {
    setTimeout(() => showBanner('active'), 600);
  }

  // Sync sidebar height when banner is visible
  syncSidebarTop();

  if (screenId === 'screen-validator') {
    startValidatorCountdown();
  }

  if (screenId === 'screen-dashboard') {
    animateKPIs();
  }
}

// ═══════════════════════════════════════════════
// GLOBAL ALERT BANNER
// ═══════════════════════════════════════════════
function showBanner(state) {
  const banner = document.getElementById('global-banner');
  const badge  = document.getElementById('banner-badge');
  const text   = document.getElementById('banner-text');
  const btn    = document.getElementById('banner-resolve-btn');

  banner.classList.remove('banner-hidden','banner-visible','banner-recovering','banner-resolved');

  if (state === 'active') {
    banner.classList.add('banner-visible');
    badge.textContent = 'INCOMPLETE DEAL';
    text.textContent  = 'Arctic Breeze Holdings LLC · WOTC phone number blank · Deal acceptance blocked · Fix required';
    btn.style.display = 'inline-block';
    btn.textContent   = 'Fix Now →';
    btn.onclick       = () => navigateTo('screen-validator');
    STATE.bannerState = 'active';
  } else if (state === 'recovering') {
    banner.classList.add('banner-visible','banner-recovering');
    badge.textContent = 'RESOLVING';
    text.textContent  = 'Arctic Breeze · WOTC gap fixed · Chasing phone number confirmation · Est. complete in 10 min';
    btn.textContent   = 'View →';
    btn.onclick       = () => navigateTo('screen-validator');
    STATE.bannerState = 'recovering';
  } else if (state === 'resolved') {
    banner.classList.add('banner-visible','banner-resolved');
    badge.textContent = 'DEAL READY';
    text.textContent  = 'Arctic Breeze Holdings LLC · All documents complete · Deal accepted by K. Blackburn';
    btn.style.display = 'none';
    STATE.bannerState = 'resolved';
    // Remove alert dot from validator sidebar
    const dot = document.getElementById('validator-dot');
    if (dot) dot.style.display = 'none';
    document.querySelector('[data-screen="screen-validator"]')?.classList.remove('has-alert');
    // Auto-dismiss after 8s
    setTimeout(() => hideBanner(), 8000);
  } else if (state === 'hidden') {
    banner.classList.add('banner-hidden');
    STATE.bannerState = 'hidden';
  }

  syncSidebarTop();
}

function hideBanner() {
  const banner = document.getElementById('global-banner');
  banner.classList.remove('banner-visible','banner-recovering','banner-resolved');
  banner.classList.add('banner-hidden');
  STATE.bannerState = 'hidden';
  syncSidebarTop();
}

function syncSidebarTop() {
  const sidebar  = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  const isVisible = STATE.bannerState !== 'hidden';
  const offset    = isVisible ? 'calc(var(--nav-h) + 44px)' : 'var(--nav-h)';
  if (sidebar) sidebar.style.top = offset;
}

// ═══════════════════════════════════════════════
// VALIDATOR COUNTDOWN
// ═══════════════════════════════════════════════
function startValidatorCountdown() {
  if (STATE.arcticFixed) return;
  if (!STATE.validatorStart) STATE.validatorStart = Date.now();

  const countdownEl = document.getElementById('validator-countdown');
  if (!countdownEl) return;

  if (STATE.validatorCountdownInterval) clearInterval(STATE.validatorCountdownInterval);

  const TOTAL_SECONDS = 78 * 60; // 78 minutes from sick report

  STATE.validatorCountdownInterval = setInterval(() => {
    if (STATE.arcticFixed) {
      countdownEl.textContent = '✓ Resolved';
      countdownEl.style.color = '#4ADE80';
      clearInterval(STATE.validatorCountdownInterval);
      return;
    }
    const elapsed = Math.floor((Date.now() - STATE.validatorStart) / 1000);
    const remaining = TOTAL_SECONDS - elapsed;
    if (remaining <= 0) {
      countdownEl.textContent = 'WINDOW CLOSED';
      clearInterval(STATE.validatorCountdownInterval);
      return;
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    countdownEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 1000);
}

// ═══════════════════════════════════════════════
// LIVE TIMESTAMP
// ═══════════════════════════════════════════════
function updateTime() {
  const el = document.getElementById('nav-time');
  if (!el) return;
  const now = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  el.textContent = `${h}:${m} · ${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
}

// ═══════════════════════════════════════════════
// KPI ANIMATIONS
// ═══════════════════════════════════════════════
function animateKPIs() {
  const cards = document.querySelectorAll('#screen-dashboard .kpi-card');
  cards.forEach((c, i) => {
    c.style.opacity = '0';
    c.style.transform = 'translateY(12px)';
    setTimeout(() => {
      c.style.transition = 'opacity .35s ease, transform .35s ease';
      c.style.opacity = '1';
      c.style.transform = 'none';
    }, i * 80);
  });
}

function animateCounter(el, from, to, duration = 800) {
  const start = performance.now();
  const update = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ═══════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════
function toast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', warn: '⚠', info: 'ℹ', error: '✕' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span style="flex:1">${message}</span><button class="toast-close" onclick="removeToast(this.parentElement)">×</button>`;
  container.appendChild(t);
  if (duration) setTimeout(() => removeToast(t), duration);
}

function removeToast(el) {
  el.classList.add('removing');
  setTimeout(() => el.remove(), 250);
}
window.removeToast = removeToast;

// ═══════════════════════════════════════════════
// BUTTON HELPERS
// ═══════════════════════════════════════════════
function btnLoading(btn) {
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (label)   label.style.opacity = '0';
  if (spinner) spinner.style.display = 'inline-block';
  btn.disabled = true;
  btn.style.pointerEvents = 'none';
}

function btnSuccess(btn, text = '✓ Done') {
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (spinner) spinner.style.display = 'none';
  if (label) {
    label.textContent = text;
    label.style.opacity = '1';
  }
  btn.style.background = 'var(--green)';
  btn.disabled = false;
  btn.style.pointerEvents = 'auto';
}

function btnReset(btn, text) {
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (spinner) spinner.style.display = 'none';
  if (label)   { label.textContent = text; label.style.opacity = '1'; }
  btn.disabled = false;
  btn.style.pointerEvents = 'auto';
}

// ═══════════════════════════════════════════════
// SCREEN 0 — PROBLEM CTA
// ═══════════════════════════════════════════════
function handleSeeSolution() {
  const btn = document.getElementById('btn-see-solution');
  btnLoading(btn);
  setTimeout(() => { navigateTo('screen-dashboard'); }, 1200);
}
window.handleSeeSolution = handleSeeSolution;

// ═══════════════════════════════════════════════
// SCREEN 1 — DASHBOARD
// ═══════════════════════════════════════════════
function handleDashAccept() {
  const btn = document.getElementById('dash-accept-btn');
  btnLoading(btn);
  setTimeout(() => {
    const actions = btn.closest('.ai-callout').querySelector('.ai-callout-actions');
    actions.innerHTML = '<span class="ai-accepted">✓ Accepted by K. Blackburn · ' + getTime() + '</span>';
    STATE.dashAiAccepted = true;
    toast('AI analysis accepted — priorities confirmed', 'success');
  }, 800);
}
window.handleDashAccept = handleDashAccept;

function handleDashOverride() {
  const callout = document.querySelector('#screen-dashboard .ai-callout');
  const body    = callout.querySelector('.ai-callout-body');
  body.style.textDecoration = 'line-through';
  body.style.opacity = '.4';
  const actions = callout.querySelector('.ai-callout-actions');
  actions.innerHTML = `
    <input type="text" placeholder="Enter your decision..." style="flex:1;padding:6px 10px;border:1px solid var(--border-2);border-radius:6px;font-family:var(--font);font-size:13px;outline:none;margin-right:8px"/>
    <button class="btn-ghost btn-sm" style="color:var(--amber);border-color:var(--amber)" onclick="confirmOverride(this)">Confirm Override</button>`;
}
window.handleDashOverride = handleDashOverride;

function confirmOverride(btn) {
  const input = btn.previousElementSibling;
  const val   = input?.value?.trim() || 'Manual override';
  btn.closest('.ai-callout-actions').innerHTML = `<span style="font-size:12px;font-weight:700;color:var(--amber)">⚠ Overridden by K. Blackburn · ${getTime()} · "${val}"</span>`;
  toast('Override logged', 'warn');
}
window.confirmOverride = confirmOverride;

// ═══════════════════════════════════════════════
// SCREEN 2 — CHECKLIST GENERATOR
// ═══════════════════════════════════════════════
function handleGenerateChecklist() {
  const btn     = document.getElementById('btn-generate');
  const output  = document.getElementById('checklist-output');
  const countEl = document.getElementById('checklist-count');
  const name    = document.getElementById('cl-name').value || 'New Client';
  const eins    = parseInt(document.getElementById('cl-eins').value) || 1;
  const states  = document.getElementById('cl-states').value || 'FL';
  const freq    = document.getElementById('cl-freq').value;
  const products= [...document.querySelectorAll('#screen-checklist input[type=checkbox]:checked')].map(c=>c.value);

  if (!products.length) { toast('Select at least one product', 'warn'); return; }

  btnLoading(btn);

  // Shimmer
  output.innerHTML = `
    <div class="shimmer" style="height:20px;width:60%;margin-bottom:10px"></div>
    <div class="shimmer" style="height:60px;margin-bottom:8px"></div>
    <div class="shimmer" style="height:60px;margin-bottom:8px"></div>
    <div class="shimmer" style="height:60px"></div>`;

  setTimeout(() => {
    const docs = buildChecklist(products, eins, states);
    const groups = {};
    docs.forEach(d => { if (!groups[d.group]) groups[d.group]=[]; groups[d.group].push(d); });

    let html = `<div style="background:var(--blue-light);border:1px solid var(--blue-mid);border-radius:7px;padding:9px 13px;margin-bottom:14px;font-size:12.5px;color:var(--blue-dark)">
      <strong>${name}</strong> — ${eins} EIN${eins>1?'s':''} · ${states} · ${products.length} products · ${freq}
    </div>`;

    let total = 0;
    Object.entries(groups).forEach(([grp,items]) => {
      html += `<div class="doc-group"><div class="doc-group-title">${grp}</div>`;
      items.forEach(doc => {
        total += doc.qty || 1;
        html += `<div class="doc-item ${doc.cssClass}">
          <div class="doc-icon">${doc.icon}</div>
          <div style="flex:1">
            <div class="doc-name">${doc.name}${doc.qty>1?` <span style="color:var(--blue);font-size:12px;font-weight:700">×${doc.qty}</span>`:''}</div>
            <div class="doc-detail">${doc.detail}</div>
            <div class="doc-fields">${doc.fields.slice(0,5).join(' · ')}${doc.fields.length>5?` +${doc.fields.length-5} more`:''}</div>
          </div>
          <span class="doc-tag ${doc.tag}">${doc.tagLabel}</span>
        </div>`;
      });
      html += '</div>';
    });

    if (!docs.length) {
      html = '<div class="empty-state"><div class="empty-icon">🤔</div><div class="empty-title">No documents matched</div><div class="empty-sub">Select Payroll & Tax to generate core documents</div></div>';
    }

    output.innerHTML = html;
    countEl.textContent = `${total} document${total!==1?'s':''}`;
    countEl.style.display = 'inline';
    btnReset(btn, '⚡ Generate Document Checklist');
    STATE.checklistGenerated = true;
    toast(`Checklist generated — ${total} documents for ${name}`, 'success');
  }, 1200);
}
window.handleGenerateChecklist = handleGenerateChecklist;

function buildChecklist(products, eins, statesStr) {
  const docs = [];
  const stateList = statesStr.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  const hasPayroll = products.includes('payroll') || products.includes('hcm');

  if (hasPayroll) {
    docs.push({ group:'Core Documents', name:'Order for Services (CSA)', icon:'📋', qty:1, cssClass:'core', tag:'tag-core', tagLabel:'Core',
      detail:'THE MASTER DOCUMENT — must be collected and signed first. Every other document requirement is derived from the product line items.',
      fields:['Client Legal Name','FEIN','Address','Products','Pricing','Signature','Impl. Recovery Fee initials','Date'] });
    [
      { name:'Bank Authorization', icon:'🏦',
        detail:`Authorises Paycor to debit for payroll, taxes, fees. ${eins>1?`${eins} required — one per EIN.`:'Required.'}`,
        fields:['Client Legal Name','FEIN','Bank Name','Routing Number (9 digits)','Account Number (DDA)','Purposes checked','Signatory Name','Signatory Title','⚠️ Phone Number','Date Signed','Cannabis declaration'] },
      { name:'MICR Spec Sheet', icon:'🖨️',
        detail:`E-13B MICR encoding for check printing. Linked to Bank Auth. Sent to Deluxe.${eins>1?` ×${eins}.`:''}`,
        fields:['Routing Transit Number','Account Number','Financial Institution','Account Type'] },
      { name:'IRS Form 8655', icon:'📑',
        detail:`Reporting Agent Authorization — Paycor files 940/941/943/944 returns.${eins>1?` ${eins} required.`:''}`,
        fields:['Taxpayer Name','EIN','Address','940/941/943/944 start dates','Deposit auth dates','W-2 disclosure year','Signature','Date'] },
    ].forEach(d => docs.push({ group:'Per-EIN Documents', cssClass:'ein', tag:'tag-ein', tagLabel:'×EIN', qty:eins, ...d }));

    stateList.forEach(code => {
      const formName = STATE_POA_MAP[code] || `${code} Power of Attorney`;
      docs.push({ group:'State Documents', name:formName, icon:'🏛️', qty:eins,
        cssClass:'state', tag:'tag-state', tagLabel:'State',
        detail:'State-specific POA for ' + code + '. ' + (code==='FL'?'DR-835 (Florida Dept of Revenue). Reemployment Tax agent. Florida Tax Reg. No. may be Applied For. Paycor countersignature required.':'Verify required form with compliance team.') + (eins>1?' '+eins+' copies required.':''),
        fields:['Taxpayer Name','FEIN', code+' Tax Registration No.','Paycor as representative','Tax Type','Taxpayer Signature','Date','Paycor countersignature'] });
    });
  }

  const seen = new Set();
  products.forEach(p => {
    const trig = PRODUCT_TRIGGERS[p];
    if (trig && !seen.has(trig.name)) {
      seen.add(trig.name);
      docs.push({ group:'Third-Party Agreements', qty:1, cssClass:'third', tag:'tag-third', tagLabel:'3rd Party',
        name:trig.name, icon:trig.icon, detail:trig.note, fields:['See product agreement terms'] });
    }
  });

  return docs;
}

// ═══════════════════════════════════════════════
// SCREEN 3 — VALIDATOR
// ═══════════════════════════════════════════════
function loadArcticExample() {
  document.getElementById('val-type').value = 'wotc';
  document.getElementById('val-submitted').value = ARCTIC_BREEZE_WOTC;
}
window.loadArcticExample = loadArcticExample;

function handleValidate() {
  const btn       = document.getElementById('btn-validate');
  const docType   = document.getElementById('val-type').value;
  const submitted = document.getElementById('val-submitted').value.trim();
  const outputEl  = document.getElementById('validator-output');

  if (!submitted) { toast('Paste document field values first', 'warn'); return; }

  btnLoading(btn);
  outputEl.innerHTML = `
    <div class="shimmer" style="height:80px;margin-bottom:12px"></div>
    <div class="shimmer" style="height:40px;margin-bottom:6px"></div>
    <div class="shimmer" style="height:40px;margin-bottom:6px"></div>
    <div class="shimmer" style="height:40px"></div>`;

  setTimeout(() => {
    const result  = runValidation(docType, submitted);
    outputEl.innerHTML = renderValidationResult(result, docType);
    btnReset(btn, '🔍 Validate Document');
    STATE.validationDone = true;

    if (result.verdict === 'FAIL' || result.verdict === 'WARN') {
      toast(`${result.failed.length} field gap${result.failed.length!==1?'s':''} found — deal blocked`, 'error');
    } else {
      // Deal is now fixed
      STATE.arcticFixed = true;
      showBanner('recovering');
      toast('Document validated — all fields complete', 'success');
      setTimeout(() => {
        showBanner('resolved');
        // Update dashboard row
        const row = document.getElementById('arctic-row');
        if (row) {
          row.classList.remove(); row.classList.add('resolved');
          row.children[3].innerHTML = '<span class="badge badge-green">RESOLVED</span>';
          row.children[4].innerHTML = '<span class="badge badge-green">Complete</span>';
          row.children[5].innerHTML = '<span class="badge badge-green">✓</span>';
        }
        // Update KPI
        const kpi = document.getElementById('kpi-incomplete');
        if (kpi) animateCounter(kpi, 7, 6);
        toast('Arctic Breeze — deal accepted ✓', 'success');
      }, 12000);
    }
  }, 1800);
}
window.handleValidate = handleValidate;

function runValidation(docType, text) {
  const schema = DOC_SCHEMAS[docType];
  if (!schema) return { score:0, verdict:'FAIL', passed:[], failed:[], warnings:[], blocker:'Unknown document type' };

  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const data  = {};
  lines.forEach(l => {
    const i = l.indexOf(':');
    if (i>-1) data[l.slice(0,i).trim().toLowerCase()] = l.slice(i+1).trim();
  });

  const passed=[], failed=[], warnings=[];

  schema.required.forEach(({field, key}) => {
    const match = Object.entries(data).find(([k]) => key.some(kw => k.includes(kw)));
    const value = match?.[1];
    const blank = !value || ['[blank]','blank',''].includes(value.toLowerCase());

    if (blank) {
      const critical = ['phone','ein','fein','routing','signature','name','date','title'].some(k=>field.toLowerCase().includes(k));
      failed.push({ field, reason: value?.toLowerCase()==='[blank]' ? 'Explicitly left blank — will block deal acceptance' : 'Not found in submitted document', risk: critical?'HIGH':'MED' });
    } else {
      passed.push({ field, value });
    }
  });

  if (docType==='wotc' && schema.warning) {
    warnings.push({ field:'External Equifax URL', issue:schema.warning });
  }

  const score   = Math.round(passed.length / schema.required.length * 100);
  const verdict = score===100?'PASS':score>=70?'WARN':'FAIL';
  const topFail = failed.find(f=>f.risk==='HIGH');
  return { score, verdict, passed, failed, warnings, blocker: topFail ? `"${topFail.field}" is missing — deal cannot be accepted` : null, docName: schema.name };
}

function renderValidationResult(r, docType) {
  const scoreColor = r.score>=80?'#1A7A45':r.score>=60?'#B45309':'#C00000';
  const circ = 2*Math.PI*22;
  const offset = (circ*(1-r.score/100)).toFixed(1);
  const vClass = r.verdict==='PASS'?'verdict-pass':r.verdict==='WARN'?'verdict-warn':'verdict-fail';
  const vLabel = r.verdict==='PASS'?'✓ Deal Ready':r.verdict==='WARN'?'⚠ Needs Attention':'✕ Not Ready';

  let html = `<div class="score-wrap">
    <div class="score-ring">
      <svg width="56" height="56"><circle cx="28" cy="28" r="22" fill="none" stroke="#E8E8E8" stroke-width="5"/><circle cx="28" cy="28" r="22" fill="none" stroke="${scoreColor}" stroke-width="5" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 28 28)"/></svg>
      <span style="color:${scoreColor}">${r.score}</span>
    </div>
    <div>
      <div class="score-label">${r.docName} — Completeness</div>
      <div class="score-reason">${r.failed.length?`${r.failed.length} missing field${r.failed.length!==1?'s':''} · ${r.failed.filter(f=>f.risk==='HIGH').length} HIGH risk`:`All ${r.passed.length} required fields present`}</div>
      <span class="verdict-pill ${vClass}">${vLabel}</span>
    </div>
  </div>`;

  if (r.blocker) html += `<div class="blocker-row"><span class="blocker-icon">🚨</span><div><span class="blocker-label">BLOCKER — Deal cannot be accepted</span>${r.blocker}</div></div>`;

  if (r.failed.length) {
    html += `<div class="val-section"><div class="val-section-title">Failed (${r.failed.length})</div>`;
    r.failed.forEach(f => { html += `<div class="check-row fail"><span class="check-icon">✕</span><div><span class="check-label">${f.field} <span style="font-size:10px;font-weight:400;opacity:.6">${f.risk} RISK</span></span>${f.reason}</div></div>`; });
    html += '</div>';
  }
  if (r.warnings.length) {
    html += `<div class="val-section"><div class="val-section-title">Warnings (${r.warnings.length})</div>`;
    r.warnings.forEach(w => { html += `<div class="check-row warn"><span class="check-icon">⚠</span><div><span class="check-label">${w.field}</span>${w.issue}</div></div>`; });
    html += '</div>';
  }
  if (r.passed.length) {
    html += `<div class="val-section"><div class="val-section-title">Passed (${r.passed.length})</div>`;
    r.passed.forEach(p => { html += `<div class="check-row pass"><span class="check-icon">✓</span><div><span class="check-label">${p.field}</span>${p.value}</div></div>`; });
    html += '</div>';
  }
  return html;
}

// ═══════════════════════════════════════════════
// SCREEN 4 — EIN TRACKER
// ═══════════════════════════════════════════════
let entities = [], eid = 0;
const BASE_DOCS = [
  { name:'Order for Services (CSA)', shared:true },
  { name:'Bank Authorization',       shared:false },
  { name:'MICR Spec Sheet',          shared:false },
  { name:'IRS Form 8655',            shared:false },
  { name:'State Power of Attorney',  shared:false },
];

function addEntity(pre={}) {
  eid++;
  entities.push({ id:eid, name:pre.name||'', ein:pre.ein||'', state:pre.state||'', bank:pre.bank||'', docs:BASE_DOCS.map(d=>({...d,complete:pre.complete===true})) });
  renderTracker();
}
window.addEntity = addEntity;

function removeEntity(id) { entities=entities.filter(e=>e.id!==id); renderTracker(); }
window.removeEntity = removeEntity;

function toggleDoc(entityId, di) {
  const e=entities.find(e=>e.id===entityId);
  if(e){ e.docs[di].complete=!e.docs[di].complete; }
  renderTracker();
}
window.toggleDoc = toggleDoc;

function updateEntityField(id, f, v) { const e=entities.find(e=>e.id===id); if(e)e[f]=v; updateTrackerSummary(); }
window.updateEntityField = updateEntityField;

function renderTracker() {
  const container = document.getElementById('tracker-entities');
  const emptyEl   = document.getElementById('tracker-empty');
  const summaryEl = document.getElementById('tracker-summary');
  const aiPanel   = document.getElementById('tracker-analysis');

  if (!entities.length) {
    container.innerHTML     = '';
    emptyEl.style.display   = 'block';
    summaryEl.style.display = 'none';
    return;
  }
  emptyEl.style.display   = 'none';
  summaryEl.style.display = 'grid';

  container.innerHTML = entities.map(entity => {
    const visible = entity.docs.filter(d => !d.shared || entities.indexOf(entity)===0);
    const done    = visible.filter(d=>d.complete).length;
    const pct     = visible.length>0 ? Math.round(done/visible.length*100) : 0;
    const fillColor = pct===100?'var(--green)':'var(--blue)';
    return `<div class="ein-card">
      <div class="ein-card-head">
        <div class="ein-num">${entities.indexOf(entity)+1}</div>
        <div class="ein-name"><input type="text" value="${entity.name}" placeholder="Legal Entity Name" onchange="updateEntityField(${entity.id},'name',this.value)"/></div>
        <div class="ein-progress ${done===visible.length&&visible.length>0?'done':''}">${done}/${visible.length}${pct===100?' ✓':''}</div>
        <button class="ein-remove" onclick="removeEntity(${entity.id})">×</button>
      </div>
      <div class="ein-fields">
        <div class="ein-field"><label>EIN</label><input type="text" placeholder="00-0000000" value="${entity.ein}" onchange="updateEntityField(${entity.id},'ein',this.value)"/></div>
        <div class="ein-field"><label>State</label><input type="text" placeholder="FL" value="${entity.state}" maxlength="2" onchange="updateEntityField(${entity.id},'state',this.value)"/></div>
        <div class="ein-field"><label>Bank</label><input type="text" placeholder="Bank name" value="${entity.bank}" onchange="updateEntityField(${entity.id},'bank',this.value)"/></div>
      </div>
      <div class="ein-docs">
        ${visible.map(doc => {
          const ri = entity.docs.indexOf(doc);
          return `<div class="ein-doc-row">
            <button class="doc-toggle ${doc.complete?'done':''}" onclick="toggleDoc(${entity.id},${ri})">${doc.complete?'✓':''}</button>
            <span class="doc-name-text ${doc.complete?'done':''}">${doc.name}</span>
            ${doc.shared?'<span class="shared-pill">Shared</span>':''}
          </div>`;
        }).join('')}
        <div class="ein-progress-bar">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--grey-500);margin-bottom:3px"><span>Progress</span><span>${pct}%</span></div>
          <div class="ein-progress-track"><div class="ein-progress-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        </div>
      </div>
    </div>`;
  }).join('');
  updateTrackerSummary();
}

function updateTrackerSummary() {
  if (!entities.length) return;
  let total=0, done=0;
  entities.forEach(e => {
    const v=e.docs.filter(d=>!d.shared||entities.indexOf(e)===0);
    total+=v.length; done+=v.filter(d=>d.complete).length;
  });
  document.getElementById('sum-entities').textContent = entities.length;
  document.getElementById('sum-docs').textContent     = total;
  document.getElementById('sum-done').textContent     = done;
  document.getElementById('sum-out').textContent      = total-done;
}

function handleTrackerAnalyze() {
  if (entities.length<2) { toast('Add at least 2 entities to run multi-EIN analysis', 'warn'); return; }
  const btn     = document.getElementById('btn-analyze');
  const panel   = document.getElementById('tracker-analysis');
  const content = document.getElementById('tracker-analysis-content');

  btnLoading(btn);
  panel.style.display = 'block';
  content.innerHTML   = '<div class="shimmer" style="height:200px"></div>';

  setTimeout(() => {
    content.innerHTML = buildTrackerAnalysis();
    btnReset(btn, '🤖 Identify Shared Data & Build Plan');
    STATE.trackerAnalyzed = true;
    panel.scrollIntoView({ behavior:'smooth', block:'start' });
    toast('Entity analysis complete — shared data identified', 'success');
  }, 2000);
}
window.handleTrackerAnalyze = handleTrackerAnalyze;

function buildTrackerAnalysis() {
  const n      = entities.length;
  const states = [...new Set(entities.filter(e=>e.state).map(e=>e.state))];
  const noEin  = entities.filter(e=>!e.ein);
  const noBank = entities.filter(e=>!e.bank);
  let total=0, done=0;
  entities.forEach(e=>{ const v=e.docs.filter(d=>!d.shared||entities.indexOf(e)===0); total+=v.length; done+=v.filter(d=>d.complete).length; });

  return `<div class="analysis-content">
    <div class="analysis-highlight">
      <strong>${n} entities · ${total} documents total · ${done} complete · ${total-done} outstanding</strong><br/>
      Old process: ${n*4+1} separate DocuSign sends tracked manually in a seller's inbox.
      This tracker: ${Math.ceil((n*4+1)/3)} batched sends with per-entity status. One view.
    </div>
    <h3>Shared Data — Collect Once, Apply to All ${n} Entities</h3>
    <ul>
      <li>Order for Services (CSA) — 1 document covers all entities and determines all other requirements</li>
      <li>Primary contact name, title, and email (${entities[0]?.name||'billing entity'} contact)</li>
      <li>Billing address and payroll frequency</li>
      <li>Product mix and pricing (from CSA line items)</li>
      ${n>1&&states.length===1?`<li>All entities in ${states[0]} — POA set may be consolidated, confirm with compliance</li>`:''}
    </ul>
    <h3>Entity-Specific — Must Collect Per Entity (×${n})</h3>
    <ul>
      <li>EIN / FEIN — unique to each legal entity</li>
      <li>Bank name, routing number, and account number (DDA)</li>
      <li>Authorised bank account signatory (name + title)</li>
      <li>State tax registration number ${states.length>1?'(varies by state per entity)':''}</li>
    </ul>
    <h3>Recommended Collection Sequence</h3>
    <ul>
      <li><strong>Step 1:</strong> CSA signed first — unlocks full document requirement list</li>
      <li><strong>Step 2:</strong> Bank Auth + MICR for all ${n} entities — send as one batched request, not ${n} individual sends</li>
      <li><strong>Step 3:</strong> IRS 8655 for all ${n} EINs — pre-populate shared fields (contact, address) to reduce client effort</li>
      <li><strong>Step 4:</strong> State POA${states.length>1?'s':''} for ${states.join(', ')||'(states to be confirmed)'}${states.length>1?' — group by state, one Paycor countersignature per state':''}</li>
    </ul>
    ${noEin.length?`<div class="analysis-warn">⚠ <strong>Missing EINs:</strong> ${noEin.map(e=>e.name||'Unnamed').join(', ')} — IRS Form 8655 cannot be prepared. Chase immediately.</div>`:''}
    ${noBank.length?`<div class="analysis-warn">⚠ <strong>Missing bank details:</strong> ${noBank.map(e=>e.name||'Unnamed').join(', ')} — Bank Auth and MICR Spec Sheet blocked.</div>`:''}
    ${done===total?`<div class="analysis-success">✓ All documents complete — deal is ready for acceptance queue.</div>`:`<div class="analysis-highlight">${total-done} document${total-done!==1?'s':''} outstanding. Chase priority: entity with fewest complete docs first.</div>`}
  </div>`;
}

// ═══════════════════════════════════════════════
// SCREEN 5 — DEAL ACCEPTANCE
// ═══════════════════════════════════════════════
function handleAcceptDeal(deal) {
  const btn   = document.getElementById(`btn-accept-${deal}`);
  const panel = document.getElementById('accept-confirm-panel');
  const content = document.getElementById('accept-confirm-content');
  btnLoading(btn);

  setTimeout(() => {
    btnSuccess(btn, '✓ Approved');
    STATE.clearwaterAccepted = true;
    panel.style.display = 'block';
    content.innerHTML = `<div class="confirm-log">
      <div class="confirm-row"><span>${getTime()}</span><span style="color:var(--green);font-weight:700">✓ Deal auto-approved — all fields validated</span></div>
      <div class="confirm-row"><span></span><span>Clearwater Logistics LLC · 12/12 documents · Score 100/100</span></div>
      <div class="confirm-row"><span></span><span>Approved by: K. Blackburn · Strategic Initiatives · ${getTime()}</span></div>
      <div class="confirm-row"><span></span><span style="color:var(--green)">Salesforce deal stage updated · Implementation team notified</span></div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn-ghost btn-sm">View audit trail</button>
        <button class="btn-ghost btn-sm" style="color:var(--amber);border-color:var(--amber)" id="btn-undo-accept">Undo (30s)</button>
      </div>
    </div>`;
    // Undo auto-expires
    setTimeout(() => { const ub=document.getElementById('btn-undo-accept'); if(ub)ub.remove(); }, 30000);
    // Update dashboard KPI
    const kpi = document.getElementById('kpi-queue');
    if (kpi) animateCounter(kpi, 4, 3);
    toast('Clearwater Logistics — deal approved and logged ✓', 'success');
    panel.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 2000);
}
window.handleAcceptDeal = handleAcceptDeal;

function handleAcceptAiAnalysis() {
  const btn = document.getElementById('accept-ai-btn');
  btnLoading(btn);
  setTimeout(() => {
    const actions = btn.closest('.ai-callout-actions');
    actions.innerHTML = `<span class="ai-accepted">✓ Accepted by K. Blackburn · ${getTime()}</span>`;
    STATE.acceptAiAccepted = true;
    toast('AI analysis accepted — priorities confirmed', 'success');
  }, 800);
}
window.handleAcceptAiAnalysis = handleAcceptAiAnalysis;

// ═══════════════════════════════════════════════
// KEYBOARD NAVIGATION
// ═══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  const idx = SCREEN_ORDER.indexOf(STATE.currentScreen);
  if (e.key === 'ArrowRight' && idx < SCREEN_ORDER.length-1) navigateTo(SCREEN_ORDER[idx+1]);
  if (e.key === 'ArrowLeft'  && idx > 0)                      navigateTo(SCREEN_ORDER[idx-1]);
  if (e.key === 'Escape') document.querySelectorAll('.toast').forEach(removeToast);
});

// ═══════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════
function getTime() {
  const n=new Date(); return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Live clock
  updateTime(); setInterval(updateTime, 30000);

  // Pre-load Arctic Breeze + Restivo as demo entities
  addEntity({ name:'Arctic Breeze Holdings LLC', ein:'41-3945539', state:'FL', bank:'UMB, NA' });
  addEntity({ name:'Restivo Holdings LLC',       ein:'',           state:'FL', bank:'' });
  entities[0].docs[0].complete = true; // CSA already signed
  renderTracker();

  // Pre-fill checklist
  const nameEl = document.getElementById('cl-name');
  if (nameEl) nameEl.value = 'Arctic Breeze Holdings LLC';

  // Pre-load validator example
  loadArcticExample();

  toast('POC loaded — Arctic Breeze deal pre-loaded · Use ← → keys to navigate', 'info', 5000);
});
