/* =========================================================================
   MOCK DATA LAYER
   Everything below is fabricated. In a real build this would come from an
   extraction pipeline, a document store, and a permissions-aware API.
   ========================================================================= */

export const USERS = [
  { id: 'u_client_maria', name: 'Maria Alvarez', role: 'client', initials: 'MA', firmRole: null, note: 'Individual taxpayer, first year on the platform' },
  { id: 'u_client_new', name: 'David Chen', role: 'client', initials: 'DC', firmRole: null, note: 'Brand-new account, nothing started yet', firstRun: true },
  { id: 'u_preparer_jordan', name: 'Jordan Blake', role: 'preparer', initials: 'JB', firmRole: 'Senior Preparer', hasPersonalReturn: true },
  { id: 'u_reviewer_sam', name: 'Sam Okafor', role: 'reviewer', initials: 'SO', firmRole: 'Reviewing CPA' },
  { id: 'u_admin_lee', name: 'Lee Park', role: 'admin', initials: 'LP', firmRole: 'Firm Administrator' },
  { id: 'u_seasonal_ren', name: 'Ren Osei', role: 'seasonal', initials: 'RO', firmRole: 'Seasonal Preparer (Level 1)' },
];

export const STATUS_STAGES = ['Intake', 'Documents Needed', 'In Preparation', 'In Review', 'Client Action Needed', 'Filed'];
export const STATUS_META = {
  'Intake': { color: 'var(--ink-40)', bg: '#EEEDE8', client: 'We\u2019re setting up your return', happened: 'Account created. Initial questionnaire not yet completed.' },
  'Documents Needed': { color: 'var(--pending)', bg: 'var(--pending-bg)', client: 'We need a few documents from you', happened: 'Intake questionnaire complete. Waiting on documents from the client before drafting can start.' },
  'In Preparation': { color: 'var(--ai)', bg: 'var(--ai-bg)', client: 'Your preparer is working on your return', happened: 'Documents received and extracted. Preparer is actively drafting the return.' },
  'In Review': { color: 'var(--ai)', bg: 'var(--ai-bg)', client: 'A second CPA is reviewing your return', happened: 'Documents collected, values extracted, preparer draft complete. Awaiting reviewer sign-off.' },
  'Client Action Needed': { color: 'var(--blocked)', bg: 'var(--blocked-bg)', client: 'We need your input to continue', happened: 'Preparer draft complete, but a required document or answer is still missing from the client.' },
  'Filed': { color: 'var(--verified)', bg: 'var(--verified-bg)', client: 'Your return has been filed', happened: 'Return was reviewed, approved, and filed.' },
};

function seedDocs(returnId, count, startId) {
  const types = ['W-2', '1099-NEC', '1099-INT', '1099-DIV', '1098 Mortgage Interest', 'K-1', 'Receipt: Charitable', 'Receipt: Business Expense', 'Bank Statement', 'Prior Year Return', 'Broker Statement', 'Property Tax Bill'];
  const out = [];
  // Skewed on purpose: the first ~40% of documents all land in one category
  // instead of spreading evenly across all 12 types. An even spread meant no
  // category ever got big enough to actually need the "show more" truncation
  // in the Documents tab, even on a 143-document return — this makes at
  // least one category genuinely large so that UI gets exercised for real.
  const skewCutoff = Math.floor(count * 0.4);
  for (let i = 0; i < count; i++) {
    const t = i < skewCutoff ? types[0]: types[1 + (i % (types.length - 1))];
    out.push({
      id: `doc_${startId + i}`,
      returnId,
      name: `${t}: ${['Employer Co', 'Acme LLC', 'First Union Bank', 'Chase', 'Fidelity', 'Self-Employed', 'Vanguard', 'County Assessor'][i % 8]}`,
      type: t,
      pages: 1 + (i % 4),
      uploadedAt: `2026-0${1 + (i % 3)}-${String(2 + (i % 26)).padStart(2, '0')}`,
      uploadedBy: i % 5 === 0 ? 'CPA Request': 'Client Upload',
      status: i % 9 === 0 ? 'needs-review': (i % 13 === 0 ? 'flagged': 'processed'),
    });
  }
  return out;
}

const BASE_RETURNS = [
  { id: 'ret_1001', client: 'Maria Alvarez', clientId: 'u_client_maria', type: 'Individual (1040)', year: 2025, stage: 'In Review', preparer: 'Jordan Blake', reviewer: 'Sam Okafor', urgency: 'high', dueDate: '2026-08-01', blocked: false, docsCount: 34 },
  { id: 'ret_1002', client: 'David Chen', clientId: 'u_client_new', type: 'Individual (1040)', year: 2025, stage: 'Intake', preparer: 'Jordan Blake', reviewer: null, urgency: 'low', dueDate: '2026-09-15', blocked: false, docsCount: 0 },
  { id: 'ret_1003', client: 'Nguyen Family Trust', clientId: null, type: 'Trust (1041)', year: 2025, stage: 'Client Action Needed', preparer: 'Jordan Blake', reviewer: 'Sam Okafor', urgency: 'critical', dueDate: '2026-07-28', blocked: true, docsCount: 61 },
  { id: 'ret_1004', client: 'Bright Leaf Bakery LLC', clientId: null, type: 'Partnership (1065)', year: 2025, stage: 'In Preparation', preparer: 'Ren Osei', reviewer: null, urgency: 'medium', dueDate: '2026-08-15', blocked: false, docsCount: 88 },
  { id: 'ret_1005', client: 'Priya Raman', clientId: null, type: 'Individual (1040)', year: 2025, stage: 'Documents Needed', preparer: 'Jordan Blake', reviewer: null, urgency: 'medium', dueDate: '2026-08-30', blocked: false, docsCount: 12 },
  { id: 'ret_1006', client: 'Harold Voss', clientId: null, type: 'Individual (1040)', year: 2025, stage: 'Filed', preparer: 'Ren Osei', reviewer: 'Sam Okafor', urgency: 'low', dueDate: '2026-04-15', blocked: false, docsCount: 22 },
  { id: 'ret_1007', client: 'Cedar & Vine Partners', clientId: null, type: 'Partnership (1065)', year: 2025, stage: 'In Review', preparer: 'Jordan Blake', reviewer: 'Sam Okafor', urgency: 'high', dueDate: '2026-07-26', blocked: false, docsCount: 143 },
  { id: 'ret_1008', client: 'Jordan Blake (Personal)', clientId: 'u_preparer_jordan', type: 'Individual (1040)', year: 2025, stage: 'Documents Needed', preparer: 'Sam Okafor', reviewer: null, urgency: 'low', dueDate: '2026-09-30', blocked: false, docsCount: 6, isStaffPersonal: true },
];

// Additional generated returns purely to demonstrate the dashboard, All
// Returns, and Documents holding up at real volume (Challenge 07 / 09
// explicitly ask for this to be tested against more than a handful of rows).
const EXTRA_CLIENT_NAMES_CURATED = [
  'Elena Cruz', 'Marcus Webb', 'Sunrise Diner LLC', 'Okonkwo & Associates', 'Meadowbrook HOA',
  'Priya Nair', 'Delacroix Studio LLC', 'Tom Whitfield', 'Ironwood Logistics LLC', 'Grace Lindqvist',
  'Route Nine Auto Repair', 'Salma Idris', 'Benjamin Ortiz', 'Alpine Ridge Partners', 'Fatima Al-Sayed',
  'Copper Kettle Brewing LLC', 'Wei Chen', 'Hartley Family Trust', 'Diego Fuentes', 'Nadia Petrov',
  'Blue Heron Landscaping LLC', 'Owen McAllister', 'Sofia Marchetti', 'Redwood Dental Group',
];

// Programmatically generated on top of the curated list so the dashboard,
// All Returns, and Documents actually have to hold up at something close to
// the case study's literal "hundreds of returns" language — 24 hand-picked
// names alone (the original count) was closer to a few dozen than hundreds.
const GEN_FIRST = ['James', 'Olivia', 'Liam', 'Sophia', 'Noah', 'Ava', 'Ethan', 'Mia', 'Lucas', 'Isabella', 'Henry', 'Amelia', 'Jack', 'Harper', 'Leo', 'Evelyn', 'Owen', 'Abigail', 'Caleb', 'Ella', 'Wyatt', 'Scarlett', 'Julian', 'Nora', 'Miles', 'Ruby', 'Theo', 'Hazel', 'Felix', 'Ivy'];
const GEN_LAST = ['Sullivan', 'Reyes', 'Foster', 'Bennett', 'Coleman', 'Hayes', 'Warren', 'Mitchell', 'Torres', 'Delgado', 'Kim', 'Rossi', 'Novak', 'Haddad', 'Larsen', 'Duarte', 'Okoro', 'Singh', 'Adler', 'Farrow', 'Nakamura', 'Osei', 'Villanueva', 'Bergström', 'Kowalski'];
const GEN_BIZ_WORD = ['Harbor', 'Cedar', 'Maple', 'Union', 'Sterling', 'Northgate', 'Willow', 'Granite', 'Lakeside', 'Fieldstone', 'Crestview', 'Amber', 'Pinecrest', 'Riverside', 'Summit'];
const GEN_BIZ_SUFFIX = ['LLC', 'Partners', 'Group', 'Studio', 'Associates', 'Consulting'];

const EXTRA_CLIENT_NAMES = EXTRA_CLIENT_NAMES_CURATED.slice();
for (let i = 0; i < 150; i++) {
  if (i % 5 === 4) {
    // roughly 1 in 5 generated entries is a small business
    EXTRA_CLIENT_NAMES.push(`${GEN_BIZ_WORD[i % GEN_BIZ_WORD.length]} ${GEN_BIZ_SUFFIX[i % GEN_BIZ_SUFFIX.length]}`);
  } else {
    EXTRA_CLIENT_NAMES.push(`${GEN_FIRST[i % GEN_FIRST.length]} ${GEN_LAST[(i * 7) % GEN_LAST.length]}`);
  }
}

const EXTRA_PREPARERS = ['Jordan Blake', 'Ren Osei'];
const EXTRA_URGENCY = ['low', 'medium', 'medium', 'high', 'critical'];

// Return type is inferred from the name instead of cycling independently —
// an LLC filing an Individual 1040 looked like a data-entry mistake.
function inferTypeFromName(name) {
  if (/Trust\b|HOA\b/.test(name)) return 'Trust (1041)';
  if (/LLC|Partners|Associates|Studio|Group|Logistics|Repair|Brewing|Diner|Landscaping|Consulting|Dental/i.test(name)) return 'Partnership (1065)';
  return 'Individual (1040)';
}

// Due date is derived from urgency instead of an independent formula — a
// "critical" item landing later than a "low" one made the underlying data
// contradict itself even though the dashboard's sort happened to hide it.
const TODAY = new Date('2026-07-25');
const URGENCY_DUE_RANGE = { critical: [2, 6], high: [7, 15], medium: [18, 35], low: [38, 65] };
function dueDateForUrgency(urgency, seed) {
  const [min, max] = URGENCY_DUE_RANGE[urgency];
  const days = min + (seed % (max - min + 1));
  const d = new Date(TODAY.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export const RETURNS = BASE_RETURNS.concat(EXTRA_CLIENT_NAMES.map((name, i) => {
  const stage = STATUS_STAGES[i % STATUS_STAGES.length];
  const preparer = EXTRA_PREPARERS[i % EXTRA_PREPARERS.length];
  // A return can't be "In Review" or "Filed" without an actual reviewer —
  // those stages imply review already happened or is happening. Only
  // earlier stages (Intake, Documents Needed, In Preparation, Client Action
  // Needed) can plausibly have no reviewer assigned yet.
  const hasReviewer = (stage === 'In Review' || stage === 'Filed') ? true : i % 3 !== 0;
  const urgency = EXTRA_URGENCY[i % EXTRA_URGENCY.length];
  return {
    id: `ret_20${String(i + 1).padStart(2, '0')}`,
    client: name,
    clientId: null,
    type: inferTypeFromName(name),
    year: 2025,
    stage,
    preparer,
    reviewer: hasReviewer ? 'Sam Okafor': null,
    urgency,
    dueDate: dueDateForUrgency(urgency, i + Math.floor(i / EXTRA_URGENCY.length) * 11),
    blocked: stage === 'Client Action Needed' && i % 2 === 0,
    docsCount: 4 + (i % 6) * 3,
  };
}));

export let DOCUMENTS = [];
let docCursor = 1;
RETURNS.forEach(r => { const n = r.docsCount; DOCUMENTS = DOCUMENTS.concat(seedDocs(r.id, n, docCursor)); docCursor += n; });

// Looks up an actual document by (returnId, type) instead of a hardcoded ID \u2014
// hardcoded IDs like 'doc_5' silently break the moment document generation
// order changes (which it already has once), pointing traceability fields
// at the wrong document entirely.
function findDoc(returnId, type) {
  return DOCUMENTS.find(d => d.returnId === returnId && d.type === type) || null;
}

// Traceable fields for the flagship return (ret_1001) \u2014 Challenge 01.
// Hand-authored content (labels, transform text, confidence) is kept as-is;
// only the document reference is resolved dynamically now.
const MARIA_FIELD_SPECS = [
  { id: 'f1', label: 'Wages, tips, other compensation (Line 1a)', value: '$84,210', docType: 'W-2', region: 'Box 1', transform: 'Copied directly from W-2 Box 1', confidence: 0.98, aiGenerated: true, verified: true, editable: false },
  { id: 'f2', label: 'Federal income tax withheld (Line 25a)', value: '$11,760', docType: 'W-2', region: 'Box 2', transform: 'Copied directly from W-2 Box 2', confidence: 0.98, aiGenerated: true, verified: true, editable: false },
  { id: 'f3', label: 'Taxable interest (Line 2b)', value: '$412', docType: '1099-INT', region: 'Box 1', transform: 'Summed across 2 accounts on 1099-INT', confidence: 0.95, aiGenerated: true, verified: false, editable: true },
  { id: 'f4', label: 'Ordinary dividends (Line 3b)', value: '$1,204', docType: '1099-DIV', region: 'Box 1a', transform: 'Copied from 1099-DIV Box 1a', confidence: 0.91, aiGenerated: true, verified: false, editable: true },
  { id: 'f5', label: 'Mortgage interest deduction (Sch. A)', value: '$9,860', docType: '1098 Mortgage Interest', region: 'Box 1', transform: 'Copied from 1098 Box 1; capped per loan-limit worksheet', confidence: 0.87, aiGenerated: true, verified: false, editable: true, flagged: true },
  { id: 'f6', label: 'Charitable contributions (Sch. A)', value: '$2,300', docType: 'Receipt: Charitable', region: 'Receipt total', transform: 'Summed 4 receipts uploaded by client', confidence: 0.72, aiGenerated: true, verified: false, editable: true, flagged: true },
  { id: 'f7', label: 'Filing status', value: 'Married Filing Jointly', docType: null, region: null, transform: 'Selected by client during intake questionnaire', confidence: null, aiGenerated: false, verified: true, editable: false, source: 'client-entered' },
  { id: 'f8', label: 'Preparer sign-off: Line 1a', value: 'Approved', docType: null, region: null, transform: 'Manually approved by preparer after review', confidence: null, aiGenerated: false, verified: true, editable: false, source: 'preparer-locked', locked: true },
];

// A smaller, generic template used for every OTHER return (instead of every
// non-Maria return silently showing a truncated copy of Maria's exact
// numbers, which made every client's return look identical and, for a
// zero-document return like David Chen's, showed already-extracted wages
// on a return that hadn't had anything uploaded yet).
const GENERIC_FIELD_TEMPLATES = [
  { label: 'Wages, tips, other compensation (Line 1a)', docType: 'W-2', region: 'Box 1', transform: 'Copied directly from W-2 Box 1', baseValue: 52000, baseConfidence: 0.96 },
  { label: 'Federal income tax withheld (Line 25a)', docType: 'W-2', region: 'Box 2', transform: 'Copied directly from W-2 Box 2', baseValue: 6400, baseConfidence: 0.96 },
  { label: 'Taxable interest (Line 2b)', docType: '1099-INT', region: 'Box 1', transform: 'Copied from 1099-INT Box 1', baseValue: 180, baseConfidence: 0.93 },
  { label: 'Nonemployee compensation', docType: '1099-NEC', region: 'Box 1', transform: 'Copied from 1099-NEC Box 1', baseValue: 14500, baseConfidence: 0.9 },
];

function generateFieldsForReturn(ret, index) {
  if (ret.docsCount === 0) return []; // nothing extracted yet \u2014 no documents to extract from
  const fields = [];
  GENERIC_FIELD_TEMPLATES.forEach((tpl, ti) => {
    const doc = findDoc(ret.id, tpl.docType);
    if (!doc) return; // this return doesn't happen to have this document type \u2014 skip rather than fake it
    const value = tpl.baseValue + ((index * 137 + ti * 53) % 900) * 10;
    fields.push({
      id: `gf_${ret.id}_${ti}`,
      label: tpl.label,
      value: `$${value.toLocaleString()}`,
      doc: doc.id,
      page: 1,
      region: tpl.region,
      transform: tpl.transform,
      confidence: Math.max(0.7, tpl.baseConfidence - ((index + ti) % 4) * 0.03),
      aiGenerated: true,
      verified: false,
      editable: true,
    });
  });
  return fields;
}

export const TRACE_FIELDS_BY_RETURN = {};
RETURNS.forEach((ret, i) => {
  if (ret.id === 'ret_1001') {
    TRACE_FIELDS_BY_RETURN[ret.id] = MARIA_FIELD_SPECS.map(spec => {
      const doc = spec.docType ? findDoc(ret.id, spec.docType) : null;
      const { docType, ...rest } = spec;
      // Page is derived from the region against the document's real page
      // count \u2014 hardcoding a page number independently of the actual
      // document risks claiming a field is "on page 2" of a document that
      // only has 1 page.
      const page = doc ? (['Box 1a', 'Receipt total'].includes(spec.region) ? Math.min(2, doc.pages) : 1) : null;
      return { ...rest, doc: doc ? doc.id : null, page };
    });
  } else {
    TRACE_FIELDS_BY_RETURN[ret.id] = generateFieldsForReturn(ret, i);
  }
});

// Kept for anything still importing the old flat export directly.
export const TRACE_FIELDS = TRACE_FIELDS_BY_RETURN['ret_1001'];

const MARIA_1098 = findDoc('ret_1001', '1098 Mortgage Interest');

// Messages \u2014 Challenge 02
export const MESSAGES = [
  { id: 'm1', returnId: 'ret_1001', visibility: 'client', from: 'Jordan Blake', role: 'preparer', linkedTo: { type: 'document', id: MARIA_1098 ? MARIA_1098.id : null, label: '1098 Mortgage Interest' }, text: 'Can you confirm this 1098 covers your primary residence only, not the rental property?', at: 'Jul 21, 9:14 AM', ownerNext: 'Maria Alvarez', resolved: false },
  { id: 'm2', returnId: 'ret_1001', visibility: 'client', from: 'Maria Alvarez', role: 'client', linkedTo: { type: 'document', id: MARIA_1098 ? MARIA_1098.id : null, label: '1098 Mortgage Interest' }, text: 'Yes, primary residence only: the rental has its own separate loan.', at: 'Jul 21, 2:40 PM', ownerNext: 'Jordan Blake', resolved: true },
  { id: 'm3', returnId: 'ret_1001', visibility: 'internal', from: 'Jordan Blake', role: 'preparer', linkedTo: { type: 'field', id: 'f6', label: 'Charitable contributions' }, text: 'Confidence on the charitable total is low: 2 of 4 receipts are blurry photos. Flag for Sam before sign-off.', at: 'Jul 22, 8:02 AM', ownerNext: 'Sam Okafor', resolved: false },
  { id: 'm4', returnId: 'ret_1001', visibility: 'internal', from: 'Sam Okafor', role: 'reviewer', linkedTo: { type: 'field', id: 'f6', label: 'Charitable contributions' }, text: 'Agreed: request re-upload or itemized bank statement instead of relying on OCR here.', at: 'Jul 22, 9:15 AM', ownerNext: 'Jordan Blake', resolved: false },
  { id: 'm5', returnId: 'ret_1003', visibility: 'client', from: 'Jordan Blake', role: 'preparer', linkedTo: { type: 'task', id: 't3', label: 'Trust distribution schedule' }, text: 'We\u2019re missing the K-1 distribution schedule for beneficiary #2. Filing can\u2019t proceed without it.', at: 'Jul 20, 11:00 AM', ownerNext: 'Nguyen Family Trust', resolved: false },
];

// Tasks for dashboard prioritization \u2014 Challenge 07
const BASE_TASKS = [
  { id: 't1', returnId: 'ret_1003', title: 'Missing K-1 distribution schedule blocks filing', owner: 'u_preparer_jordan', urgency: 'critical', due: '2026-07-28', reason: 'Approaching its deadline \u00b7 client has not responded' },
  { id: 't2', returnId: 'ret_1001', title: 'Low-confidence charitable total needs reviewer sign-off', owner: 'u_reviewer_sam', urgency: 'high', due: '2026-07-25', reason: 'AI confidence 72% \u00b7 flagged by preparer' },
  { id: 't3', returnId: 'ret_1007', title: '143 documents ingested: review partnership allocation', owner: 'u_preparer_jordan', urgency: 'high', due: '2026-07-26', reason: 'Largest return in queue \u00b7 approaching deadline' },
  { id: 't4', returnId: 'ret_1005', title: 'Send document checklist to Priya Raman', owner: 'u_preparer_jordan', urgency: 'medium', due: '2026-08-01', reason: 'No documents uploaded yet' },
  { id: 't5', returnId: 'ret_1004', title: 'Confirm partner ownership % changed mid-year', owner: 'u_seasonal_ren', urgency: 'medium', due: '2026-08-05', reason: 'Flagged by AI: prior year % doesn\u2019t match new K-1 draft' },
  { id: 't6', returnId: 'ret_1002', title: 'Welcome call with new client', owner: 'u_preparer_jordan', urgency: 'low', due: '2026-08-10', reason: 'First-time client, onboarding incomplete' },
];

// Generated on top of the base tasks so the dashboard's priority queue and
// per-person "my work" views actually have enough volume to demonstrate
// ranking and a "show more" pattern (Challenge 07 explicitly calls out that
// the dashboard needs to stay usable with a real caseload, not just a
// handful of demo rows).
const TASK_TEMPLATES = [
  { stage: 'Intake', title: r => `Send welcome checklist to ${r.client}`, reason: 'Onboarding not yet started' },
  { stage: 'Documents Needed', title: r => `Follow up on missing documents: ${r.client}`, reason: 'No response since last request' },
  { stage: 'In Preparation', title: r => `Continue draft prep for ${r.client}`, reason: 'Documents extracted, draft in progress' },
  { stage: 'In Review', title: r => `Reviewer sign-off needed: ${r.client}`, reason: 'Preparer draft complete, awaiting review' },
  { stage: 'Client Action Needed', title: r => `Waiting on client response: ${r.client}`, reason: 'Blocking item unresolved' },
];
const NAME_TO_USER_ID = { 'Jordan Blake': 'u_preparer_jordan', 'Ren Osei': 'u_seasonal_ren', 'Sam Okafor': 'u_reviewer_sam' };

const EXTRA_TASKS = RETURNS.filter(r => r.id.startsWith('ret_20')).map((r, i) => {
  const template = TASK_TEMPLATES.find(t => t.stage === r.stage) || TASK_TEMPLATES[2];
  // Every 4th generated task is assigned to the reviewer instead of the preparer,
  // so Sam's queue has more than the one hand-authored item too.
  const owner = (i % 4 === 3 && r.reviewer) ? NAME_TO_USER_ID[r.reviewer]: NAME_TO_USER_ID[r.preparer];
  return {
    id: `t20${String(i + 1).padStart(2, '0')}`,
    returnId: r.id,
    title: template.title(r),
    owner,
    // Urgency comes from the return itself, not an independent cycle — the
    // due date was already derived from r.urgency, so a task disagreeing
    // with its own return's urgency (e.g. "critical" due 6 weeks out)
    // would silently contradict the very date shown next to it.
    urgency: r.urgency,
    due: r.dueDate,
    reason: template.reason,
  };
});

export const TASKS = BASE_TASKS.concat(EXTRA_TASKS);

// AI outputs \u2014 Challenge 10
// `fieldId` links a flag back to the actual TRACE_FIELDS entry it's about,
// where one exists — this is what lets "Accept & apply" here also mark that
// field verified over in Review & Traceability, instead of the two screens
// describing the same fact independently with no connection between them.
export const AI_FLAGS = [
  { id: 'a1', returnId: 'ret_1001', kind: 'warning', title: 'Charitable receipt total may be incomplete', confidence: 0.72, fieldId: 'f6', evidence: ['2 of 4 uploaded receipts are low-resolution photos', 'Amount extracted from partial text on receipt #3', 'No bank statement cross-reference available'], suggestion: 'Request a clearer photo or itemized statement before filing.', clientSummary: 'We had trouble reading two of your charitable donation receipts clearly. Your preparer may reach out asking for a clearer photo.' },
  { id: 'a2', returnId: 'ret_1001', kind: 'info', title: 'Mortgage interest capped by loan-limit worksheet', confidence: 0.87, fieldId: 'f5', evidence: ['1098 reports $11,200 in interest paid', 'Loan balance exceeds the $750,000 acquisition-debt limit', 'Deduction reduced proportionally per IRS worksheet'], suggestion: 'No action needed: cap applied automatically. Verify loan balance if it changed this year.', clientSummary: 'Your mortgage interest deduction was automatically adjusted because your loan balance is above the IRS limit for full deductibility. No action is needed from you.' },
  { id: 'a3', returnId: 'ret_1004', kind: 'warning', title: 'Partner ownership percentage inconsistent with prior year', confidence: 0.66, fieldId: null, evidence: ['Prior year K-1: Partner B at 30%', 'New draft K-1: Partner B at 22%', 'No partnership agreement amendment on file'], suggestion: 'Confirm with the client whether an ownership change occurred mid-year.', clientSummary: 'One partner\u2019s ownership share looks different from last year. Your preparer will confirm with you whether that changed.' },
  { id: 'a4', returnId: 'ret_1007', kind: 'info', title: '143 documents auto-sorted into 9 categories', confidence: 0.94, fieldId: null, evidence: ['Categorization based on document layout and header text', '12 documents required manual type confirmation'], suggestion: 'Spot-check the "Other Income" category: it has the most manual overrides.', clientSummary: 'All of your uploaded documents have been organized and categorized automatically.' },
  { id: 'a5', returnId: 'ret_1008', kind: 'warning', title: 'Withholding total lower than prior year', confidence: 0.79, fieldId: null, evidence: ['Prior year withholding: $9,400', 'Current year extracted withholding: $6,100', 'No amended W-2 on file explaining the change'], suggestion: 'Confirm the correct W-2 was uploaded before filing.', clientSummary: 'Your withholding amount looks different from last year. Your reviewer will confirm it before filing.' },
];

export const ROLE_NAV = {
  client: [{ k: 'home', label: 'Home', icon: '\u2302' }, { k: 'return', label: 'My Return', icon: '\uD83D\uDCC4' }, { k: 'documents', label: 'Documents', icon: '\uD83D\uDDC2\uFE0F' }, { k: 'messages', label: 'Messages', icon: '\u2709\uFE0F' }],
  preparer: [{ k: 'dashboard', label: 'Dashboard', icon: '\u2302' }, { k: 'returns', label: 'All Returns', icon: '\uD83D\uDCC1' }, { k: 'documents', label: 'Documents', icon: '\uD83D\uDDC2\uFE0F' }, { k: 'messages', label: 'Messages', icon: '\u2709\uFE0F' }],
  reviewer: [{ k: 'dashboard', label: 'Review Queue', icon: '\u2302' }, { k: 'returns', label: 'All Returns', icon: '\uD83D\uDCC1' }, { k: 'messages', label: 'Messages', icon: '\u2709\uFE0F' }],
  admin: [{ k: 'dashboard', label: 'Firm Overview', icon: '\u2302' }, { k: 'returns', label: 'All Returns', icon: '\uD83D\uDCC1' }, { k: 'team', label: 'Team & Roles', icon: '\uD83D\uDC65' }],
  seasonal: [{ k: 'dashboard', label: 'My Assignments', icon: '\u2302' }, { k: 'documents', label: 'Documents', icon: '\uD83D\uDDC2\uFE0F' }, { k: 'messages', label: 'Messages', icon: '\u2709\uFE0F' }],
};
