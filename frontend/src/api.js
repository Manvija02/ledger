/* =========================================================================
   REAL API CLIENT
   Replaces the mock data layer (data.js) for anything wired up to the
   FastAPI backend. Set VITE_API_URL in a .env file if the backend isn't
   running on the default http://localhost:8000.
   ========================================================================= */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'ledger_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* not JSON */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ---------- Auth ---------- */

// The backend returns snake_case (Python convention); normalize to the
// camelCase shape the frontend components already expect from data.js.
function normalizeUser(u) {
  return { ...u, firmRole: u.firm_role, firstRun: u.first_run };
}

export async function login(email, password) {
  const { access_token } = await request('/auth/login', { method: 'POST', body: { email, password } });
  setToken(access_token);
  return getMe();
}

export function logout() {
  setToken(null);
}

export async function getMe() {
  const u = await request('/auth/me');
  return normalizeUser(u);
}

/* ---------- Returns ---------- */

// Same normalization pattern as normalizeUser above: the backend is
// snake_case, the existing frontend components read the data.js camelCase
// shape (r.client, r.clientId, r.dueDate, ...). Normalizing here means the
// tab components below only need to change where they actually fetch data,
// not every place they read a field off it.
function normalizeReturn(r) {
  return {
    ...r,
    client: r.client_name,
    clientId: r.client_id,
    dueDate: r.due_date,
    isStaffPersonal: r.is_staff_personal,
    docsCount: r.docs_count,
  };
}

function normalizeField(f) {
  return {
    ...f,
    doc: f.document_id,
    aiGenerated: f.ai_generated,
    corrected: !!f.corrected_from,
    originalValue: f.corrected_from,
    verifiedBy: f.corrected_by,
  };
}

function normalizeFlag(fl) {
  return { ...fl, fieldId: fl.field_id, clientSummary: fl.client_summary };
}

export async function listReturns() {
  const rows = await request('/returns');
  return rows.map(normalizeReturn);
}

export async function getReturn(id) {
  return normalizeReturn(await request(`/returns/${id}`));
}

export function updateStage(id, stage) {
  return request(`/returns/${id}/stage`, { method: 'PATCH', body: { stage } });
}

/* ---------- Fields & AI ---------- */
export async function listFields(returnId) {
  const rows = await request(`/returns/${returnId}/fields`);
  return rows.map(normalizeField);
}

export async function listFlags(returnId) {
  const rows = await request(`/returns/${returnId}/ai-flags`);
  return rows.map(normalizeFlag);
}

export async function correctField(fieldId, value, correctedBy) {
  return normalizeField(await request(`/ai/fields/${fieldId}`, { method: 'PATCH', body: { value, corrected_by: correctedBy } }));
}

export async function actOnFlag(flagId, action, correctedValue) {
  return normalizeFlag(await request(`/ai/flags/${flagId}`, { method: 'POST', body: { action, corrected_value: correctedValue } }));
}

export function extractDocument(documentId) {
  return request(`/ai/extract/${documentId}`, { method: 'POST' });
}

/* ---------- Documents ---------- */
function normalizeDocument(d) {
  return { ...d, returnId: d.return_id, uploadedAt: d.uploaded_at, uploadedBy: d.uploaded_by };
}

export async function listDocuments(returnId) {
  const rows = await request(`/documents?return_id=${encodeURIComponent(returnId)}`);
  return rows.map(normalizeDocument);
}

export async function getDocument(documentId) {
  return normalizeDocument(await request(`/documents/${documentId}`));
}

export async function uploadDocument(returnId, docType, file) {
  const form = new FormData();
  form.append('return_id', returnId);
  form.append('doc_type', docType);
  form.append('file', file);
  return normalizeDocument(await request('/documents', { method: 'POST', body: form, isForm: true }));
}

/* ---------- Messages ---------- */
function normalizeMessage(m) {
  return {
    ...m,
    returnId: m.return_id,
    from: m.from_name,
    linkedTo: {
      type: m.linked_type || 'general',
      id: m.linked_id || 'general',
      label: m.linked_label || 'General',
    },
    at: new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    ownerNext: m.owner_next,
  };
}

export async function listMessages(returnId) {
  const rows = await request(`/returns/${returnId}/messages`);
  return rows.map(normalizeMessage);
}

export async function postMessage(returnId, payload) {
  return normalizeMessage(await request(`/returns/${returnId}/messages`, { method: 'POST', body: payload }));
}

/* ---------- Users ---------- */
export async function listUsers() {
  const rows = await request('/users');
  return rows.map(u => ({ ...u, firmRole: u.firm_role, firstRun: u.first_run }));
}
/* ---------- Tasks ---------- */
export function listMyTasks(ownerUserId, limit = 1000) {
  const q = ownerUserId ? `?owner_user_id=${encodeURIComponent(ownerUserId)}&limit=${limit}` : `?limit=${limit}`;
  return request(`/tasks${q}`);
}
