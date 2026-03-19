/* ══════════════════════════════════════════════════
   Paycor Document Collection POC — app.js
   Powered by Claude API (claude-sonnet-4-20250514)
   Conquer AI © 2026
══════════════════════════════════════════════════ */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

// ── Core knowledge base from the engagement ──────
const PAYCOR_KNOWLEDGE = `
You are the Paycor Document Collection Agent built by Conquer AI.
You have deep knowledge of Paycor's HCM sales process.

CORE DOCUMENT RULES (from real deal analysis):
- Bank Authorization: Required for EVERY EIN. Covers AutoDebit, Direct Deposit, Net Check, Garnishments, Tax File/Workers Comp. Must be signed by authorized signer on the bank account. Requires routing number, account number (DDA), FEIN.
- MICR Spec Sheet: Required alongside Bank Authorization. Encodes routing/account info in E-13B format. Sent to Deluxe (bank data management). Separate from Bank Auth but linked.
- IRS Form 8655 (Reporting Agent Authorization): Required for EVERY EIN. Authorizes Paycor to sign/file 940, 941, 943, 944, 945 returns and make deposits. W-2 disclosure authorization required. Must include: taxpayer legal name, EIN, address, tax types, start dates.
- State Power of Attorney: Required for EVERY STATE of operation. Each state has its own form. Florida = DR-835 (includes reemployment tax agent designation). Must be signed by taxpayer AND Paycor representative.
- Order for Services (CSA): THE MASTER DOCUMENT. Must be collected first. Determines all other required documents based on product line items.
- WOTC Agreement (Equifax): Triggered ONLY if WOTC product purchased. Third-party form. Client must also complete external review at workforce.equifax.com. DocuSign signature alone is NOT sufficient — external confirmation required.
- OnDemand Pay Agreement (PayActiv): Triggered ONLY if OnDemand Pay purchased.
- The Work Number Authorization (TALX/Equifax): Triggered ONLY if The Work Number purchased.
- Benefits Advisor: No separate document — handled within CSA.
- 401k EDI: No separate agreement beyond CSA.

MULTI-EIN RULES:
- Bank Auth: 1 per EIN (some entities may share bank account — identify and flag)
- MICR Sheet: 1 per EIN
- IRS 8655: 1 per EIN  
- State POA: 1 per state per EIN (entities in same state can share ONE POA)
- CSA: 1 per deal (covers all entities)
- Third-party forms: 1 per deal (not per EIN)

SHARED DATA (fill once, apply across entities):
- Client legal name of parent entity
- Contact person name and email
- Billing address
- Payroll frequency
- Product mix (from CSA)

VALIDATION RULES:
Bank Authorization required fields: Client Legal Name, FEIN, Bank Name, Routing Number (9 digits), Account Number, Purposes checked, Authorized Signatory Name, Signatory Title, Date Signed, Phone Number of signatory, Confirmation that client is NOT in cannabis industry.
IRS 8655 required fields: Taxpayer Name, EIN (9 digits), Address, City/State/ZIP, Contact Person, Tax return types checked with start dates (940/941/943/944), Deposit authorization start dates, W-2 disclosure year, Taxpayer Signature, Title, Date.
WOTC required fields: Client Legal Name, Business Address, City/State/ZIP, NAISC/SIC Code, Total Employees, Contact First Name, Contact Phone Number (THIS IS COMMONLY MISSING), Contact Email, Signature, Date.
State POA (Florida DR-835) required fields: Taxpayer Name, Address, FEIN, Florida Tax Registration Number (may be "Applied For"), Representative details (Paycor Inc., 4811 Montgomery Rd, Cincinnati OH 45212), Tax type (Reemployment Tax), Taxpayer Signature, Date, Title, Paycor representative signature and date.

KNOWN DEAL DATA (Arctic Breeze Holdings LLC — real closed deal Feb 2026):
- Client: Arctic Breeze Holdings LLC
- FEIN: 413945539
- Address: 15 Hargrove Ln UNIT 2C, Palm Coast, FL 32137
- Bank: UMB, NA | Routing: 101000695 | Account: 9872711475
- Signed by: Ed Patrosso, CFO | Date: 2/2/2026
- Products: HCM Core, Payroll & Tax, WOTC, Benefits Advisor, Learning Mgmt, Recruiting Pro, OnDemand Pay, The Work Number, 401k EDI
- EINs: 1 (Arctic Breeze Holdings LLC) — billing entity. Restivo Holdings LLC = payroll processing entity
- State: Florida
- Employees: 45
- Known gap: WOTC form submitted with BLANK phone number — passed through without detection
`;

// ── API call with streaming ───────────────────────
async function callClaude(systemPrompt, userMessage, onToken) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': window.ANTHROPIC_KEY || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          onToken(parsed.delta.text);
        }
      } catch {}
    }
  }
}

// ── Non-streaming fallback ───────────────────────
async function callClaudeSimple(systemPrompt, userMessage) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': window.ANTHROPIC_KEY || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

// ── Loading helpers ──────────────────────────────
function showLoading(text = 'Running AI analysis...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ── Render markdown-ish text ─────────────────────
function renderText(text) {
  return text
    .replace(/### (.+)/g, '<h3>$1</h3>')
    .replace(/## (.+)/g, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[HIGHLIGHT\]([\s\S]+?)\[\/HIGHLIGHT\]/g, '<div class="highlight">$1</div>')
    .replace(/\[WARNING\]([\s\S]+?)\[\/WARNING\]/g, '<div class="warning">$1</div>')
    .replace(/\[SUCCESS\]([\s\S]+?)\[\/SUCCESS\]/g, '<div class="success">$1</div>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hupldi])/gm, '')
    .trim();
}

// ══════════════════════════════════════════════════
// VIEW 1 — CHECKLIST GENERATOR
// ══════════════════════════════════════════════════

document.getElementById('btn-generate-checklist').addEventListener('click', async () => {
  const clientName  = document.getElementById('cl-client-name').value || 'New Client';
  const einCount    = parseInt(document.getElementById('cl-ein-count').value) || 1;
  const employees   = document.getElementById('cl-employees').value || '50';
  const states      = document.getElementById('cl-states').value || 'Unknown';
  const bank        = document.getElementById('cl-bank').value || 'TBD';
  const payFreq     = document.getElementById('cl-payroll-freq').value;
  const products    = [...document.querySelectorAll('#products input:checked')].map(c => c.value);

  if (products.length === 0) {
    alert('Select at least one product sold.');
    return;
  }

  const outputEl = document.getElementById('checklist-output');
  const countEl  = document.getElementById('checklist-count');

  showLoading('Generating document checklist...');

  const prompt = `Generate a complete document checklist for this Paycor deal.

Deal Details:
- Client Name: ${clientName}
- Products Sold: ${products.join(', ')}
- Number of EINs: ${einCount}
- Employees: ${employees}
- States of Operation: ${states}
- Bank: ${bank}
- Payroll Frequency: ${payFreq}

Return a JSON array of document objects. Each object must have:
{
  "group": "Core Documents" | "Per-EIN Documents" | "State Documents" | "Third-Party Agreements",
  "name": "document name",
  "quantity": number (total copies needed),
  "detail": "why required and any key notes",
  "type": "required" | "per-ein" | "state" | "third-party",
  "fields": ["list", "of", "required", "fields"],
  "recipient": "who fills/signs this",
  "trigger": "what triggered this requirement"
}

Return ONLY the JSON array, no other text.`;

  try {
    const raw = await callClaudeSimple(PAYCOR_KNOWLEDGE, prompt);
    let docs;
    try {
      const jsonMatch = raw.match(/\[[\s\S]+\]/);
      docs = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new Error('Could not parse document list from AI response.');
    }

    // Group documents
    const groups = {};
    docs.forEach(doc => {
      if (!groups[doc.group]) groups[doc.group] = [];
      groups[doc.group].push(doc);
    });

    const typeIcon = { required: '📄', 'per-ein': '🏢', state: '🏛️', 'third-party': '🤝' };
    const typeTag  = {
      required:     '<span class="doc-tag tag-required">Core</span>',
      'per-ein':    '<span class="doc-tag tag-per-ein">×EIN</span>',
      state:        '<span class="doc-tag tag-state">State</span>',
      'third-party':'<span class="doc-tag tag-third">3rd Party</span>'
    };

    let html = '';
    let total = 0;

    Object.entries(groups).forEach(([group, items]) => {
      html += `<div class="doc-group">
        <div class="doc-group-title">${group}</div>`;
      items.forEach(doc => {
        total += doc.quantity || 1;
        html += `<div class="doc-item ${doc.type}">
          <div class="doc-icon">${typeIcon[doc.type] || '📄'}</div>
          <div style="flex:1">
            <div class="doc-name">${doc.name} ${doc.quantity > 1 ? `<span style="color:var(--blue);font-size:12px">×${doc.quantity}</span>` : ''}</div>
            <div class="doc-detail">${doc.detail}</div>
            ${doc.fields ? `<div style="font-size:11px;color:var(--grey-500);margin-top:4px;font-family:var(--mono)">Fields: ${doc.fields.join(', ')}</div>` : ''}
          </div>
          ${typeTag[doc.type] || ''}
        </div>`;
      });
      html += '</div>';
    });

    outputEl.innerHTML = html;
    countEl.textContent = `${total} docs`;
    countEl.style.display = 'inline';

  } catch (err) {
    outputEl.innerHTML = `<div class="field-check fail"><span class="field-check-icon">✕</span><div class="field-check-text"><div class="field-check-label">Error</div>${err.message}<br><br><small>Check your API key in config.js</small></div></div>`;
  } finally {
    hideLoading();
  }
});

// ══════════════════════════════════════════════════
// VIEW 2 — DOCUMENT VALIDATOR
// ══════════════════════════════════════════════════

// Load Arctic Breeze example (the real deal with the known gap)
document.getElementById('btn-load-example').addEventListener('click', () => {
  document.getElementById('val-doc-type').value = 'wotc';
  document.getElementById('val-state').value = 'FL';
  document.getElementById('val-submitted').value = `Client Legal Name: Arctic Breeze Holdings LLC
Business Address: 15 Hargrove Ln UNIT 2C
City/State/ZIP: Palm Cost, FL 32137
NAISC/SIC: PERSONAL SERVICES
Total Employees: 45
Client Contact First Name: Ed Patrosso
Client Contact Phone Number: [BLANK]
Client Contact Email: epatrosso@tristatewater.com
Signature: [SIGNED - Ed Patrosso]
Title: CFO
Date: 2/2/2026
Services: WOTC Yes, Federal Disaster Credit Yes, Location Based Services Yes`;
});

document.getElementById('btn-validate').addEventListener('click', async () => {
  const docType   = document.getElementById('val-doc-type').value;
  const submitted = document.getElementById('val-submitted').value.trim();
  const state     = document.getElementById('val-state').value;
  const outputEl  = document.getElementById('validator-output');

  if (!submitted) {
    alert('Paste the submitted field values to validate.');
    return;
  }

  showLoading('Validating document completeness...');

  const prompt = `Validate the following submitted document against the required fields.

Document Type: ${docType}
State: ${state || 'N/A'}

Submitted Fields:
${submitted}

Return a JSON object with this structure:
{
  "score": 0-100,
  "verdict": "PASS" | "FAIL" | "WARN",
  "verdict_reason": "one sentence",
  "passed": [{"field": "name", "value": "submitted value", "note": ""}],
  "failed": [{"field": "name", "reason": "why it failed", "risk": "HIGH|MED|LOW"}],
  "warnings": [{"field": "name", "issue": "description"}],
  "deal_ready": true | false,
  "blocker": "null or description of the single most critical issue"
}

Return ONLY the JSON, no other text.`;

  try {
    const raw = await callClaudeSimple(PAYCOR_KNOWLEDGE, prompt);
    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]+\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      throw new Error('Could not parse validation result.');
    }

    const scoreColor = result.score >= 80 ? '#16A34A' : result.score >= 60 ? '#D97706' : '#DC2626';
    const circumference = 2 * Math.PI * 30;
    const dashOffset = circumference * (1 - result.score / 100);
    const verdictClass = result.verdict === 'PASS' ? 'verdict-pass' : result.verdict === 'WARN' ? 'verdict-warn' : 'verdict-fail';

    let html = `
      <div class="score-ring-wrap">
        <div class="score-ring">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#EAEDF1" stroke-width="7"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke="${scoreColor}" stroke-width="7"
              stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
              stroke-linecap="round" style="transition:stroke-dashoffset .5s ease"/>
          </svg>
          <div class="score-ring-num">${result.score}</div>
        </div>
        <div>
          <div class="score-label">Completeness Score</div>
          <div class="score-sub">${result.verdict_reason}</div>
          <span class="verdict-pill ${verdictClass}">${result.verdict === 'PASS' ? '✓ Deal Ready' : result.verdict === 'WARN' ? '⚠ Needs Attention' : '✕ Not Ready'}</span>
        </div>
      </div>`;

    if (result.blocker && result.blocker !== 'null') {
      html += `<div class="field-check fail" style="margin-bottom:14px">
        <span class="field-check-icon">🚨</span>
        <div class="field-check-text"><div class="field-check-label">BLOCKER</div>${result.blocker}</div>
      </div>`;
    }

    if (result.failed?.length) {
      html += `<div class="validation-section">
        <div class="validation-section-title">Failed Checks (${result.failed.length})</div>`;
      result.failed.forEach(f => {
        html += `<div class="field-check fail">
          <span class="field-check-icon">✕</span>
          <div class="field-check-text">
            <div class="field-check-label">${f.field} <span style="font-size:10px;font-weight:400;opacity:.7">${f.risk} RISK</span></div>
            ${f.reason}
          </div>
        </div>`;
      });
      html += '</div>';
    }

    if (result.warnings?.length) {
      html += `<div class="validation-section">
        <div class="validation-section-title">Warnings (${result.warnings.length})</div>`;
      result.warnings.forEach(w => {
        html += `<div class="field-check warn">
          <span class="field-check-icon">⚠</span>
          <div class="field-check-text"><div class="field-check-label">${w.field}</div>${w.issue}</div>
        </div>`;
      });
      html += '</div>';
    }

    if (result.passed?.length) {
      html += `<div class="validation-section">
        <div class="validation-section-title">Passed (${result.passed.length})</div>`;
      result.passed.forEach(p => {
        html += `<div class="field-check pass">
          <span class="field-check-icon">✓</span>
          <div class="field-check-text"><div class="field-check-label">${p.field}</div>${p.value || ''}</div>
        </div>`;
      });
      html += '</div>';
    }

    outputEl.innerHTML = html;

  } catch (err) {
    outputEl.innerHTML = `<div class="field-check fail"><span class="field-check-icon">✕</span><div class="field-check-text"><div class="field-check-label">Error</div>${err.message}</div></div>`;
  } finally {
    hideLoading();
  }
});

// ══════════════════════════════════════════════════
// VIEW 3 — MULTI-EIN TRACKER
// ══════════════════════════════════════════════════

let entities = [];
let entityCounter = 0;

const CORE_DOCS = [
  { name: 'Bank Authorization', type: 'per-ein', shared: false },
  { name: 'MICR Spec Sheet',    type: 'per-ein', shared: false },
  { name: 'IRS Form 8655',      type: 'per-ein', shared: false },
  { name: 'State POA',          type: 'per-ein', shared: false },
  { name: 'Order for Services', type: 'shared',  shared: true  },
];

function addEntity(prefill = null) {
  entityCounter++;
  const id = entityCounter;
  const entity = {
    id,
    name: prefill?.name || '',
    ein:  prefill?.ein  || '',
    state: prefill?.state || '',
    bank:  prefill?.bank  || '',
    docs: CORE_DOCS.map(d => ({ ...d, complete: false }))
  };
  entities.push(entity);
  renderTracker();
}

function removeEntity(id) {
  entities = entities.filter(e => e.id !== id);
  renderTracker();
}

function toggleDoc(entityId, docIndex) {
  const entity = entities.find(e => e.id === entityId);
  if (entity) {
    entity.docs[docIndex].complete = !entity.docs[docIndex].complete;
    renderTracker();
  }
}

function renderTracker() {
  const container  = document.getElementById('tracker-entities');
  const emptyEl    = document.getElementById('tracker-empty');
  const summaryEl  = document.getElementById('tracker-summary');
  const aiOutputEl = document.getElementById('tracker-ai-output');

  if (entities.length === 0) {
    container.innerHTML  = '';
    emptyEl.style.display    = 'block';
    summaryEl.style.display  = 'none';
    aiOutputEl.style.display = 'none';
    return;
  }

  emptyEl.style.display   = 'none';
  summaryEl.style.display = 'grid';

  let totalDocs = 0, completeDocs = 0;

  container.innerHTML = entities.map(entity => {
    const entityDocs = entity.docs.filter(d => !d.shared || entities.indexOf(entity) === 0);
    const done = entityDocs.filter(d => d.complete).length;
    const total = entityDocs.length;
    totalDocs += total;
    completeDocs += done;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;

    return `
    <div class="ein-card" id="ein-card-${entity.id}">
      <div class="ein-card-head">
        <div class="ein-num">${entities.indexOf(entity) + 1}</div>
        <div class="ein-name">
          <input type="text" value="${entity.name}" placeholder="Legal Entity Name"
            style="border:none;background:transparent;font-size:14px;font-weight:600;font-family:var(--font);color:var(--grey-900);width:100%;outline:none;"
            onchange="updateEntity(${entity.id},'name',this.value)"/>
        </div>
        <div class="ein-progress ${done === total ? 'done' : ''}">${done}/${total} docs</div>
        <button class="ein-remove" onclick="removeEntity(${entity.id})">×</button>
      </div>
      <div class="ein-card-body">
        <div class="ein-field">
          <label>EIN</label>
          <input type="text" placeholder="00-0000000" value="${entity.ein}"
            onchange="updateEntity(${entity.id},'ein',this.value)"/>
        </div>
        <div class="ein-field">
          <label>State</label>
          <input type="text" placeholder="FL" value="${entity.state}" maxlength="2"
            onchange="updateEntity(${entity.id},'state',this.value)"/>
        </div>
        <div class="ein-field">
          <label>Bank</label>
          <input type="text" placeholder="Bank name" value="${entity.bank}"
            onchange="updateEntity(${entity.id},'bank',this.value)"/>
        </div>
      </div>
      <div class="ein-docs">
        ${entityDocs.map((doc, i) => `
          <div class="ein-doc-row">
            <div class="ein-doc-status ${doc.complete ? 'complete' : ''}"
              onclick="toggleDoc(${entity.id},${entity.docs.indexOf(doc)})">
              ${doc.complete ? '✓' : ''}
            </div>
            <div class="ein-doc-name" style="${doc.complete ? 'text-decoration:line-through;color:var(--grey-300)' : ''}">${doc.name}</div>
            ${doc.shared ? `<span class="shared-badge">Shared</span>` : ''}
          </div>
        `).join('')}
        <div style="margin-top:8px">
          <div style="height:4px;background:var(--grey-200);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct === 100 ? 'var(--green)' : 'var(--blue)'};border-radius:4px;transition:width .3s"></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Update summary
  document.getElementById('sum-entities').textContent    = entities.length;
  document.getElementById('sum-docs').textContent        = totalDocs;
  document.getElementById('sum-complete').textContent    = completeDocs;
  document.getElementById('sum-outstanding').textContent = totalDocs - completeDocs;
}

function updateEntity(id, field, value) {
  const entity = entities.find(e => e.id === id);
  if (entity) entity[field] = value;
}

// Make functions global
window.removeEntity = removeEntity;
window.toggleDoc    = toggleDoc;
window.updateEntity = updateEntity;

document.getElementById('btn-add-ein').addEventListener('click', () => addEntity());

// AI Analysis for tracker
document.getElementById('btn-analyze-tracker').addEventListener('click', async () => {
  if (entities.length < 2) {
    alert('Add at least 2 entities to run multi-EIN analysis.');
    return;
  }

  const aiOutputEl  = document.getElementById('tracker-ai-output');
  const aiContentEl = document.getElementById('tracker-ai-content');

  aiOutputEl.style.display = 'block';
  aiContentEl.innerHTML = '<div class="loading-spinner" style="margin:20px auto"></div>';

  showLoading('Analysing entities — identifying shared data...');

  const entityData = entities.map((e, i) => ({
    number: i + 1,
    name:  e.name  || `Entity ${i + 1}`,
    ein:   e.ein   || 'unknown',
    state: e.state || 'unknown',
    bank:  e.bank  || 'unknown',
    docsComplete: e.docs.filter(d => d.complete).length,
    docsTotal:    e.docs.length
  }));

  const prompt = `Analyse this multi-EIN deal and produce a structured collection plan.

Entities:
${JSON.stringify(entityData, null, 2)}

Provide:
1. Which data fields are SHARED across all entities (fill once, apply to all)
2. Which fields must be collected SEPARATELY per entity (EIN-specific)
3. Exact document count breakdown (total across all entities)
4. Priority order for collection (which entity/document to chase first)
5. Key risks or complications based on the entity structure

Format your response clearly with section headers. Be specific and commercially sharp.
Use [HIGHLIGHT] ... [/HIGHLIGHT] for key insights.
Use [WARNING] ... [/WARNING] for risks.
Use [SUCCESS] ... [/SUCCESS] for what's already done.`;

  try {
    let fullText = '';
    await callClaude(
      PAYCOR_KNOWLEDGE,
      prompt,
      (token) => {
        fullText += token;
        aiContentEl.innerHTML = `<div class="ai-output">${renderText(fullText)}</div>`;
      }
    );
  } catch (err) {
    aiContentEl.innerHTML = `<div class="field-check fail"><span class="field-check-icon">✕</span><div class="field-check-text">${err.message}</div></div>`;
  } finally {
    hideLoading();
  }
});

// ── Load example entities on startup ─────────────
function loadDemoEntities() {
  addEntity({ name: 'Arctic Breeze Holdings LLC', ein: '41-3945539', state: 'FL', bank: 'UMB, NA' });
  addEntity({ name: 'Restivo Holdings LLC',       ein: '',           state: 'FL', bank: '' });
  // Pre-tick shared doc on first entity
  if (entities[0]) entities[0].docs.find(d => d.name === 'Order for Services').complete = true;
  renderTracker();
}

// ── Nav switching ────────────────────────────────
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
  });
});

// ── Check for API key ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadDemoEntities();

  // Check config
  if (!window.ANTHROPIC_KEY) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;background:#193D6A;color:#fff;
      padding:10px 20px;font-size:13px;font-family:var(--font,sans-serif);
      display:flex;align-items:center;gap:16px;z-index:999;
    `;
    banner.innerHTML = `
      <span>⚠️ <strong>API Key Required</strong> — Open <code style="background:rgba(255,255,255,.15);padding:2px 6px;border-radius:3px">config.js</code> and add your Anthropic API key to enable AI features.</span>
      <button onclick="this.parentElement.remove()" style="background:rgba(255,255,255,.15);border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:inherit">✕</button>
    `;
    document.body.appendChild(banner);
  }
});
