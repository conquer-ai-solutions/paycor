/* ══════════════════════════════════════════════════
   Paycor Document Collection POC — app.js
   MOCK DATA VERSION — No API required, works offline
   Built from real deal data: Arctic Breeze Holdings LLC
   Conquer AI © 2026
══════════════════════════════════════════════════ */

// ── DOCUMENT LOGIC — built from real closing packet ─
const PRODUCT_DOC_MAP = {
  hcm_core:    [],
  payroll: [
    { group:'Core Documents', name:'Order for Services (CSA)', type:'required', icon:'📋',
      detail:'Master agreement — collect and sign FIRST. Every other document requirement is derived from the product line items in this document.',
      fields:['Client Legal Name','FEIN','Address','Products','Pricing','Signature','Implementation Recovery Fee initials','Date'],
      recipient:'Client CFO / CEO' },
    { group:'Per-EIN Documents', name:'Bank Authorization', type:'per-ein', icon:'🏦',
      detail:'Authorises Paycor to debit for payroll, taxes, and fees. One required per EIN — same bank account can appear across EINs but each needs its own signed form.',
      fields:['Client Legal Name','FEIN','Bank Name','Routing Number (9 digits)','Account Number (DDA)','Purposes (AutoDebit / Direct Deposit / Tax File etc.)','Signatory Name','Signatory Title','⚠ Phone Number','Date Signed','Cannabis industry declaration'],
      recipient:'Authorised signer on the bank account' },
    { group:'Per-EIN Documents', name:'MICR Spec Sheet', type:'per-ein', icon:'🖨️',
      detail:'E-13B MICR encoding spec for check printing. Sent to Deluxe (bank data management). Linked to Bank Authorization — cannot be submitted without it.',
      fields:['Routing Transit Number','Account Number','Financial Institution Name','Account Type (Business DDA)','Authorized Signature'],
      recipient:'Bank data management (Deluxe)' },
    { group:'Per-EIN Documents', name:'IRS Form 8655', type:'per-ein', icon:'📑',
      detail:'Reporting Agent Authorization. Authorises Paycor to sign and file 940, 941, 943, 944 returns and make deposits on behalf of the taxpayer.',
      fields:['Taxpayer Legal Name','EIN','Address','Tax return types with start dates (940/941/943/944)','Deposit authorization start dates','W-2 disclosure year','Taxpayer Signature','Title','Date'],
      recipient:'Taxpayer (client signatory)' },
  ],
  benefits: [
    { group:'Third-Party Agreements', name:'Benefits Advisor Confirmation', type:'third-party', icon:'🤝',
      detail:'No separate agreement form — authorisation is covered within the signed Order for Services. Pricing is per benefits-eligible employee.',
      fields:['Covered in CSA'],
      recipient:'N/A — CSA covers this' },
  ],
  wotc: [
    { group:'Third-Party Agreements', name:'WOTC Agreement (Equifax Workforce Solutions)', type:'third-party', icon:'📜',
      detail:'⚠️ CRITICAL: DocuSign signature alone does NOT make this binding. Client must separately complete review at workforce.equifax.com/assets/paycor-wotc.pdf. Fee: 15% of WOTC credits generated.',
      fields:['Client Legal Name','Business Address','City/State/ZIP','NAISC/SIC Code','Total Employees','Contact First Name','⚠️ Contact Phone Number (commonly blank)','Contact Email','Signature','Date'],
      recipient:'Client + external Equifax URL completion required' },
  ],
  ondemand: [
    { group:'Third-Party Agreements', name:'OnDemand Pay Agreement (PayActiv)', type:'third-party', icon:'💳',
      detail:'Program Summary Form required. PayActiv is a third-party provider — Paycor sends deal data to PayActiv on client\'s behalf.',
      fields:['Client signature on PayActiv Program Summary Form'],
      recipient:'Client' },
  ],
  work_number: [
    { group:'Third-Party Agreements', name:'The Work Number Authorization (TALX/Equifax)', type:'third-party', icon:'✅',
      detail:'Authorises TALX Corporation (Equifax subsidiary) to provide employment and income verifications to authorised third parties. FCRA compliance required.',
      fields:['Client consent included in CSA signature — no separate form'],
      recipient:'Covered in CSA' },
  ],
  recruiting: [],
  learning: [],
  time: [],
  '401k': [
    { group:'Third-Party Agreements', name:'401(k) EDI Processing Setup', type:'third-party', icon:'💼',
      detail:'Setup authorisation covered within CSA pricing detail. No additional standalone agreement required.',
      fields:['Covered in CSA'],
      recipient:'N/A' },
  ],
};

const STATE_POA_MAP = {
  FL:{ name:'Florida Power of Attorney (DR-835)',         note:'Florida Dept of Revenue. Reemployment Tax agent. Florida Tax Registration Number may be "Applied For". Paycor countersignature required (designation "e").' },
  OH:{ name:'Ohio Tax Agent Authorization',               note:'Ohio Dept of Taxation. Required for Ohio employer withholding tax representation.' },
  TX:{ name:'Texas Workforce Commission POA',             note:'Texas Workforce Commission. Required for Texas unemployment tax agent.' },
  CA:{ name:'California FTB 3520 + EDD DE 48',           note:'Two forms required in California: FTB 3520 for franchise tax and EDD DE 48 for payroll tax / SDI.' },
  NY:{ name:'New York State POA-1',                       note:'NYS Dept of Taxation and Finance. Required for NYS withholding tax representation.' },
  IL:{ name:'Illinois POA (IL-2848)',                     note:'Illinois Dept of Revenue. Required for IL income / withholding tax representation.' },
  PA:{ name:'Pennsylvania Power of Attorney',             note:'PA Dept of Revenue. Required for PA employer tax representation.' },
  GA:{ name:'Georgia POA (RD-1061)',                      note:'Georgia DOR representation authorisation.' },
  NC:{ name:'North Carolina GEN-58',                      note:'NCDOR. Required for NC withholding tax agent.' },
  VA:{ name:'Virginia PAR 101',                           note:'Virginia Tax. Required for VA employer withholding representation.' },
  AZ:{ name:'Arizona POA (AZ-285)',                       note:'Arizona Dept of Revenue POA.' },
  CO:{ name:'Colorado Tax Information Designation (DR 0145)', note:'Colorado DOR. Required for CO tax representation.' },
  WA:{ name:'Washington State POA',                       note:'WA Dept of Revenue. No state income tax but required for B&O and unemployment.' },
  NJ:{ name:'New Jersey POA (M-5008-R)',                  note:'NJ Division of Taxation. Required for NJ withholding representation.' },
  MA:{ name:'Massachusetts POA (M-2848)',                 note:'MA Dept of Revenue. Required for MA withholding tax agent.' },
};

const VALIDATION_SCHEMAS = {
  bank_auth:{
    name:'Bank Authorization',
    required:[
      'Client Legal Name','FEIN','Bank Name','Routing Number','Account Number',
      'Purposes (AutoDebit / Direct Deposit etc.)','Signatory Name',
      'Signatory Title','Phone Number','Date Signed','Cannabis industry declaration'
    ],
    format:{ 'Routing Number':/^\d{9}$/, 'FEIN':/^\d{2}-?\d{7}$/ }
  },
  irs_8655:{
    name:'IRS Form 8655',
    required:[
      'Taxpayer Name','EIN','Address','City/State/ZIP','Contact Person',
      'Tax return types (940/941/943/944)','Deposit authorization start dates',
      'W-2 disclosure year','Signature','Title','Date'
    ],
    format:{ 'EIN':/^\d{9}$/ }
  },
  wotc:{
    name:'WOTC Agreement (Equifax)',
    required:[
      'Client Legal Name','Business Address','City/State/ZIP','NAISC/SIC',
      'Total Employees','Contact First Name','Contact Phone Number',
      'Contact Email','Signature','Date'
    ]
  },
  state_poa:{
    name:'State Power of Attorney',
    required:[
      'Taxpayer Name','FEIN','Address','State Tax Registration Number',
      'Representative Name','Representative Address','Tax Type',
      'Taxpayer Signature','Date','Paycor Representative Signature'
    ]
  },
  csa:{
    name:'Order for Services',
    required:[
      'Client Legal Name','Address','Products listed','Employee count',
      'Pricing confirmed','Signature','Title','Date','Implementation Recovery Fee initials'
    ]
  },
  micr:{
    name:'MICR Spec Sheet',
    required:[
      'Routing Transit Number','Account Number','Financial Institution Name',
      'Account Type','Authorized Signature'
    ]
  },
};

const ARCTIC_BREEZE_EXAMPLE = `Client Legal Name: Arctic Breeze Holdings LLC
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

// ── VALIDATION ENGINE ────────────────────────────
function runValidation(docType, submittedText) {
  const schema = VALIDATION_SCHEMAS[docType];
  if (!schema) return null;

  const lines     = submittedText.split('\n').map(l=>l.trim()).filter(Boolean);
  const submitted = {};
  lines.forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0, idx).trim().toLowerCase();
      submitted[key] = line.slice(idx+1).trim();
    }
  });

  const passed=[], failed=[], warnings=[];

  schema.required.forEach(field => {
    const fKey  = field.toLowerCase().replace(/[^a-z0-9]/g,' ').trim();
    const words = fKey.split(' ').filter(w=>w.length>2);
    const match = Object.entries(submitted).find(([k]) => words.some(w=>k.includes(w)));
    const value = match?.[1];

    const isBlank = !value || ['[blank]','blank','','n/a'].includes(value.toLowerCase());

    if (isBlank) {
      const isCritical = ['phone','ein','fein','routing','signature','name','date','title'].some(k=>fKey.includes(k));
      failed.push({
        field,
        reason: value?.toLowerCase()==='[blank]'
          ? 'Explicitly left blank — will block deal acceptance'
          : 'Not found in submitted data',
        risk: isCritical ? 'HIGH':'MED'
      });
    } else {
      const cleanVal = value.replace(/[\s\-]/g,'');
      if (schema.format?.[field] && !schema.format[field].test(cleanVal)) {
        warnings.push({ field, issue:`"${value}" may not match required format` });
      } else {
        passed.push({ field, value });
      }
    }
  });

  // WOTC-specific external URL warning
  if (docType==='wotc') {
    warnings.unshift({
      field:'External Equifax Agreement URL',
      issue:'DocuSign signature alone is NOT binding for this document. Client must also complete review at workforce.equifax.com/assets/paycor-wotc.pdf — status cannot be tracked via DocuSign.'
    });
  }

  const score   = Math.round(passed.length / schema.required.length * 100);
  const verdict = score===100 ? 'PASS' : score>=70 ? 'WARN' : 'FAIL';
  const topFail = failed.find(f=>f.risk==='HIGH');

  return {
    score, verdict,
    verdict_reason: verdict==='PASS'
      ? `All ${passed.length} required fields present and valid`
      : `${failed.length} missing field${failed.length!==1?'s':''} — ${failed.filter(f=>f.risk==='HIGH').length} HIGH risk`,
    passed, failed, warnings,
    deal_ready: score===100,
    blocker: topFail ? `"${topFail.field}" is missing — this document cannot be accepted without it` : null
  };
}

// ── CHECKLIST GENERATOR ──────────────────────────
function generateChecklist(products, einCount, statesStr) {
  const docs       = [];
  const stateList  = statesStr.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  const hasPayroll = products.includes('payroll') || products.includes('hcm_core');

  // CSA always first if payroll/core
  if (hasPayroll) {
    docs.push({
      group:'Core Documents', name:'Order for Services (CSA)',
      type:'required', icon:'📋', quantity:1,
      detail:'THE MASTER DOCUMENT. Must be collected and signed first — it determines every other document requirement from its product line items.',
      fields:['Client Legal Name','FEIN','Address','Products','Pricing','Signature','Implementation Recovery Fee initials','Date'],
      recipient:'Client CFO / CEO'
    });
  }

  // Per-EIN core docs (payroll-triggered)
  if (hasPayroll) {
    [
      { name:'Bank Authorization', icon:'🏦',
        detail:`Authorises Paycor to debit for payroll, taxes, and fees. ${einCount > 1 ? `${einCount} required — one per EIN.` : 'Required.'}`,
        fields:['Client Legal Name','FEIN','Bank Name','Routing Number (9 digits)','Account Number (DDA)','Purposes checked','Signatory Name','Signatory Title','⚠️ Phone Number','Date Signed'] },
      { name:'MICR Spec Sheet', icon:'🖨️',
        detail:`E-13B MICR encoding for check printing. Linked to Bank Authorization. Sent to Deluxe.${einCount>1?' One per EIN.':''}`,
        fields:['Routing Transit Number','Account Number','Financial Institution Name','Account Type'] },
      { name:'IRS Form 8655', icon:'📑',
        detail:`Reporting Agent Authorization — authorises Paycor to file 940/941/943/944 returns.${einCount>1?` ${einCount} required — one per EIN.`:''}`,
        fields:['Taxpayer Name','EIN','Tax return types with start dates','Deposit auth dates','W-2 disclosure year','Signature','Date'] },
    ].forEach(doc => {
      docs.push({ group:'Per-EIN Documents', type:'per-ein', quantity:einCount, ...doc });
    });
  }

  // State POAs
  stateList.forEach(code => {
    const info = STATE_POA_MAP[code] || { name:`${code} Power of Attorney`, note:`State-specific POA for ${code}. Verify required form with compliance.` };
    docs.push({
      group:'State Documents', type:'state', icon:'🏛️', quantity:einCount,
      name:info.name,
      detail:`${info.note}${einCount>1?` ${einCount} copies required — one per EIN.`:''}`,
      fields:['Taxpayer Name','FEIN',`${code} Tax Registration Number (may be "Applied For")','Paycor as representative','Tax Type','Taxpayer Signature','Date','Paycor countersignature']
    });
  });

  // Product-triggered third-party docs
  const seen = new Set();
  products.forEach(p => {
    (PRODUCT_DOC_MAP[p]||[]).forEach(doc => {
      if (doc.group==='Third-Party Agreements' && !seen.has(doc.name)) {
        seen.add(doc.name);
        docs.push({ ...doc, quantity:1 });
      }
    });
  });

  return docs;
}

// ── MULTI-EIN TRACKER ────────────────────────────
let entities = [], entityCounter = 0;

const BASE_DOCS = [
  { name:'Order for Services (CSA)', shared:true,  complete:false },
  { name:'Bank Authorization',       shared:false, complete:false },
  { name:'MICR Spec Sheet',          shared:false, complete:false },
  { name:'IRS Form 8655',            shared:false, complete:false },
  { name:'State Power of Attorney',  shared:false, complete:false },
];

function addEntity(pre={}) {
  entityCounter++;
  entities.push({
    id:    entityCounter,
    name:  pre.name  || '',
    ein:   pre.ein   || '',
    state: pre.state || '',
    bank:  pre.bank  || '',
    docs:  BASE_DOCS.map(d=>({...d}))
  });
  renderTracker();
}

function removeEntity(id) {
  entities = entities.filter(e=>e.id!==id);
  renderTracker();
}

function toggleDoc(entityId, idx) {
  const e = entities.find(e=>e.id===entityId);
  if (e) e.docs[idx].complete = !e.docs[idx].complete;
  renderTracker();
}

function updateEntity(id, field, val) {
  const e = entities.find(e=>e.id===id);
  if (e) e[field] = val;
  updateSummary();
}

window.removeEntity = removeEntity;
window.toggleDoc    = toggleDoc;
window.updateEntity = updateEntity;

function updateSummary() {
  if (!entities.length) return;
  let total=0, done=0;
  entities.forEach(e => {
    const vis = e.docs.filter(d => !d.shared || entities.indexOf(e)===0);
    total += vis.length;
    done  += vis.filter(d=>d.complete).length;
  });
  document.getElementById('sum-entities').textContent    = entities.length;
  document.getElementById('sum-docs').textContent        = total;
  document.getElementById('sum-complete').textContent    = done;
  document.getElementById('sum-outstanding').textContent = total - done;
}

function renderTracker() {
  const container = document.getElementById('tracker-entities');
  const emptyEl   = document.getElementById('tracker-empty');
  const summaryEl = document.getElementById('tracker-summary');

  if (!entities.length) {
    container.innerHTML     = '';
    emptyEl.style.display   = 'block';
    summaryEl.style.display = 'none';
    document.getElementById('tracker-ai-output').style.display = 'none';
    return;
  }
  emptyEl.style.display   = 'none';
  summaryEl.style.display = 'grid';

  container.innerHTML = entities.map(entity => {
    const vis   = entity.docs.filter(d => !d.shared || entities.indexOf(entity)===0);
    const done  = vis.filter(d=>d.complete).length;
    const total = vis.length;
    const pct   = total>0 ? Math.round(done/total*100) : 0;

    return `<div class="ein-card">
      <div class="ein-card-head">
        <div class="ein-num">${entities.indexOf(entity)+1}</div>
        <div class="ein-name">
          <input type="text" value="${entity.name}" placeholder="Legal Entity Name"
            style="border:none;background:transparent;font-size:14px;font-weight:600;font-family:var(--font);color:var(--grey-900);width:100%;outline:none"
            onchange="updateEntity(${entity.id},'name',this.value)"/>
        </div>
        <div class="ein-progress ${done===total&&total>0?'done':''}">
          ${done}/${total}${pct===100?' ✓':''}
        </div>
        <button class="ein-remove" onclick="removeEntity(${entity.id})">×</button>
      </div>
      <div class="ein-card-body">
        <div class="ein-field"><label>EIN</label>
          <input type="text" placeholder="00-0000000" value="${entity.ein}"
            onchange="updateEntity(${entity.id},'ein',this.value)"/>
        </div>
        <div class="ein-field"><label>State</label>
          <input type="text" placeholder="FL" value="${entity.state}" maxlength="2"
            onchange="updateEntity(${entity.id},'state',this.value)"/>
        </div>
        <div class="ein-field"><label>Bank</label>
          <input type="text" placeholder="Bank name" value="${entity.bank}"
            onchange="updateEntity(${entity.id},'bank',this.value)"/>
        </div>
      </div>
      <div class="ein-docs">
        ${vis.map(doc => {
          const realIdx = entity.docs.indexOf(doc);
          return `<div class="ein-doc-row">
            <div class="ein-doc-status ${doc.complete?'complete':''}"
              onclick="toggleDoc(${entity.id},${realIdx})">
              ${doc.complete?'✓':''}
            </div>
            <div class="ein-doc-name" style="${doc.complete?'text-decoration:line-through;opacity:.35':''}">
              ${doc.name}
            </div>
            ${doc.shared?'<span class="shared-badge">Shared</span>':''}
          </div>`;
        }).join('')}
        <div style="margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--grey-500);margin-bottom:4px">
            <span>Progress</span><span>${pct}%</span>
          </div>
          <div style="height:5px;background:var(--grey-200);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--blue)'};border-radius:4px;transition:width .35s ease"></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  updateSummary();
}

function mockAnalysis() {
  const n       = entities.length;
  const states  = [...new Set(entities.filter(e=>e.state).map(e=>e.state))];
  const missing = entities.filter(e=>!e.ein);
  const noBank  = entities.filter(e=>!e.bank);
  let total=0, done=0;
  entities.forEach(e=>{
    const v=e.docs.filter(d=>!d.shared||entities.indexOf(e)===0);
    total+=v.length; done+=v.filter(d=>d.complete).length;
  });

  return `<div class="ai-output">
    <div class="highlight">
      <strong>${n} entities · ${total} documents total · ${done} complete · ${total-done} outstanding</strong><br>
      Old process: ${n * 4 + 1} separate DocuSign sends, manually tracked.
      This tracker: ${Math.ceil((n*4+1)/3)} batched sends with per-entity status.
    </div>

    <h3>Shared Data — Collect Once, Apply to All ${n} Entities</h3>
    <ul>
      <li>Order for Services (CSA) — 1 document covers all entities</li>
      <li>Primary contact name and email</li>
      <li>Billing address</li>
      <li>Payroll frequency</li>
      <li>Product mix</li>
      ${n>1&&states.length===1?`<li>State (all entities in ${states[0]}) — 1 POA set may cover all</li>`:''}
    </ul>

    <h3>Entity-Specific — Must Collect Per Entity</h3>
    <ul>
      <li>EIN (FEIN) — unique per legal entity</li>
      <li>Bank name, routing number, account number (DDA)</li>
      <li>Authorised bank account signatory</li>
      <li>State tax registration number${states.length>1?' (varies by state)':''}</li>
    </ul>

    <h3>Collection Priority Order</h3>
    <ul>
      <li><strong>1.</strong> CSA signed — unlocks the full requirement list</li>
      <li><strong>2.</strong> Bank Auth + MICR for all ${n} entities — send as one batched request</li>
      <li><strong>3.</strong> IRS 8655 for all ${n} EINs — pre-populate shared fields</li>
      <li><strong>4.</strong> State POA${states.length>1?'s':''} for ${states.join(', ')||'(confirm states)'}${states.length>1?' — group by state':''}</li>
    </ul>

    ${missing.length?`<div class="warning">⚠ <strong>Missing EINs:</strong> ${missing.map(e=>e.name||'Unnamed entity').join(', ')} — IRS Form 8655 cannot be prepared until EINs are confirmed. Chase these immediately.</div>`:''}
    ${noBank.length?`<div class="warning">⚠ <strong>Missing bank details:</strong> ${noBank.map(e=>e.name||'Unnamed entity').join(', ')} — Bank Auth and MICR Spec Sheet blocked until bank information provided.</div>`:''}
    ${done===total?`<div class="success">✓ All documents complete — deal is ready for acceptance queue.</div>`:`<div class="highlight">${total-done} document${total-done!==1?'s':''} still outstanding. Chase priority: entity with fewest docs complete first.</div>`}
  </div>`;
}

// ══════════════════════════════════════════════════
// WIRE UP EVENTS
// ══════════════════════════════════════════════════

document.getElementById('btn-generate-checklist').addEventListener('click', () => {
  const clientName = document.getElementById('cl-client-name').value || 'New Client';
  const einCount   = parseInt(document.getElementById('cl-ein-count').value)||1;
  const states     = document.getElementById('cl-states').value||'FL';
  const products   = [...document.querySelectorAll('#products input:checked')].map(c=>c.value);
  const outputEl   = document.getElementById('checklist-output');
  const countEl    = document.getElementById('checklist-count');

  if (!products.length) { alert('Select at least one product.'); return; }

  const docs   = generateChecklist(products, einCount, states);
  const groups = {};
  docs.forEach(d => { if (!groups[d.group]) groups[d.group]=[]; groups[d.group].push(d); });

  const typeClass = { required:'required','per-ein':'per-ein',state:'per-ein','third-party':'third-party' };
  const typeTag   = {
    required:     '<span class="doc-tag tag-required">Core</span>',
    'per-ein':    '<span class="doc-tag tag-per-ein">×EIN</span>',
    state:        '<span class="doc-tag tag-state">State</span>',
    'third-party':'<span class="doc-tag tag-third">3rd Party</span>'
  };

  let html = `<div style="background:var(--blue-light);border:1px solid #B5D4F4;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--blue-dark)">
    <strong>${clientName}</strong> — ${einCount} EIN${einCount>1?'s':''} · ${states} · ${products.length} products selected
  </div>`;

  let total = 0;
  Object.entries(groups).forEach(([grp,items]) => {
    html += `<div class="doc-group"><div class="doc-group-title">${grp}</div>`;
    items.forEach(doc => {
      total += doc.quantity||1;
      html += `<div class="doc-item ${typeClass[doc.type]||''}">
        <div class="doc-icon">${doc.icon||'📄'}</div>
        <div style="flex:1">
          <div class="doc-name">${doc.name}${doc.quantity>1?` <span style="color:var(--blue);font-size:12px;font-weight:700">×${doc.quantity}</span>`:''}</div>
          <div class="doc-detail">${doc.detail}</div>
          ${doc.fields?`<div style="font-size:11px;color:var(--grey-500);margin-top:4px;font-family:var(--mono)">${doc.fields.slice(0,5).join(' · ')}${doc.fields.length>5?` +${doc.fields.length-5} more`:''}</div>`:''}
        </div>
        ${typeTag[doc.type]||''}
      </div>`;
    });
    html += '</div>';
  });

  if (!docs.length) html = '<div class="empty-state"><div class="empty-icon">🤔</div><div class="empty-title">No documents matched</div><div class="empty-sub">Select Payroll & Tax to generate core documents</div></div>';

  outputEl.innerHTML  = html;
  countEl.textContent = `${total} document${total!==1?'s':''}`;
  countEl.style.display = 'inline';
});

document.getElementById('btn-load-example').addEventListener('click', () => {
  document.getElementById('val-doc-type').value  = 'wotc';
  document.getElementById('val-state').value     = 'FL';
  document.getElementById('val-submitted').value = ARCTIC_BREEZE_EXAMPLE;
});

document.getElementById('btn-validate').addEventListener('click', () => {
  const docType  = document.getElementById('val-doc-type').value;
  const submitted= document.getElementById('val-submitted').value.trim();
  const outputEl = document.getElementById('validator-output');
  if (!submitted) { alert('Paste submitted field values to validate.'); return; }

  const r = runValidation(docType, submitted);
  if (!r) return;

  const scoreCol = r.score>=80?'#16A34A':r.score>=60?'#D97706':'#DC2626';
  const circ     = 2*Math.PI*30;
  const offset   = (circ*(1-r.score/100)).toFixed(1);
  const vClass   = r.verdict==='PASS'?'verdict-pass':r.verdict==='WARN'?'verdict-warn':'verdict-fail';
  const vLabel   = r.verdict==='PASS'?'✓ Deal Ready':r.verdict==='WARN'?'⚠ Needs Attention':'✕ Not Ready';

  let html = `<div class="score-ring-wrap">
    <div class="score-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="30" fill="none" stroke="#EAEDF1" stroke-width="7"/>
        <circle cx="36" cy="36" r="30" fill="none" stroke="${scoreCol}" stroke-width="7"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 36 36)"/>
      </svg>
      <div class="score-ring-num">${r.score}</div>
    </div>
    <div>
      <div class="score-label">${VALIDATION_SCHEMAS[docType]?.name} — Completeness</div>
      <div class="score-sub">${r.verdict_reason}</div>
      <span class="verdict-pill ${vClass}">${vLabel}</span>
    </div>
  </div>`;

  if (r.blocker) html += `<div class="field-check fail" style="margin-bottom:14px">
    <span class="field-check-icon">🚨</span>
    <div class="field-check-text"><div class="field-check-label">BLOCKER — cannot accept deal</div>${r.blocker}</div>
  </div>`;

  if (r.failed.length) {
    html += `<div class="validation-section"><div class="validation-section-title">Failed (${r.failed.length})</div>`;
    r.failed.forEach(f => {
      html += `<div class="field-check fail"><span class="field-check-icon">✕</span>
        <div class="field-check-text"><div class="field-check-label">${f.field} <span style="font-size:10px;opacity:.6">${f.risk} RISK</span></div>${f.reason}</div>
      </div>`;
    });
    html += '</div>';
  }

  if (r.warnings.length) {
    html += `<div class="validation-section"><div class="validation-section-title">Warnings (${r.warnings.length})</div>`;
    r.warnings.forEach(w => {
      html += `<div class="field-check warn"><span class="field-check-icon">⚠</span>
        <div class="field-check-text"><div class="field-check-label">${w.field}</div>${w.issue}</div>
      </div>`;
    });
    html += '</div>';
  }

  if (r.passed.length) {
    html += `<div class="validation-section"><div class="validation-section-title">Passed (${r.passed.length})</div>`;
    r.passed.forEach(p => {
      html += `<div class="field-check pass"><span class="field-check-icon">✓</span>
        <div class="field-check-text"><div class="field-check-label">${p.field}</div>${p.value}</div>
      </div>`;
    });
    html += '</div>';
  }

  outputEl.innerHTML = html;
});

document.getElementById('btn-add-ein').addEventListener('click', () => addEntity());

document.getElementById('btn-analyze-tracker').addEventListener('click', () => {
  if (entities.length < 2) { alert('Add at least 2 entities to run multi-EIN analysis.'); return; }
  const out = document.getElementById('tracker-ai-output');
  const con = document.getElementById('tracker-ai-content');
  out.style.display = 'block';
  con.innerHTML     = mockAnalysis();
  out.scrollIntoView({ behavior:'smooth', block:'start' });
});

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

// ── Init ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Pre-load Arctic Breeze + Restivo as demo entities
  addEntity({ name:'Arctic Breeze Holdings LLC', ein:'41-3945539', state:'FL', bank:'UMB, NA' });
  addEntity({ name:'Restivo Holdings LLC',       ein:'',           state:'FL', bank:'' });
  entities[0].docs[0].complete = true; // CSA already signed
  renderTracker();

  // Pre-fill checklist tab with Arctic Breeze data
  document.getElementById('cl-client-name').value = 'Arctic Breeze Holdings LLC';
  document.getElementById('cl-states').value      = 'FL';
  document.getElementById('cl-bank').value        = 'UMB, NA';
  document.getElementById('cl-ein-count').value   = '1';
});
