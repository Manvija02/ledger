import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import * as api from '../../api';
import { Card, AffordanceTag, ConfidenceMeter } from '../../components/Shared';
import { useViewer } from '../../components/Layout';
import { useUser } from '../../UserContext';

// Challenge 01 + 08 — Source Document Traceability & affordances.
// Fields now come straight from the backend (GET /returns/:id/fields),
// which itself comes from real Gemini-based extraction — not fabricated data.
export default function ReviewTab() {
  const { ret } = useOutletContext();
  const { user } = useUser();
  const viewer = useViewer();
  const location = useLocation();

  const [fields, setFields] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [docsById, setDocsById] = useState({});

  const load = useCallback(() => {
    api.listFields(ret.id).then(setFields).catch(e => setLoadError(e.message));
    api.listDocuments(ret.id).then(docs => setDocsById(Object.fromEntries(docs.map(d => [d.id, d])))).catch(() => {});
  }, [ret.id]);

  useEffect(() => { load(); }, [load]);

  const arrivedForCorrection = location.state && location.state.autoEdit;
  const [selectedId, setSelectedId] = useState(location.state && location.state.fieldId ? location.state.fieldId : null);
  const [editingId, setEditingId] = useState(arrivedForCorrection ? location.state.fieldId : null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedField = fields ? (fields.find(f => f.id === selectedId) || null) : null;
  const doc = selectedField && selectedField.doc ? docsById[selectedField.doc] : null;

  if (loadError) {
    return <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--blocked)', fontSize: 13.5 }}>Couldn't load fields: {loadError}</div>;
  }
  if (!fields) {
    return <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-40)', fontSize: 13.5 }}>Loading…</div>;
  }
  if (fields.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-40)', fontSize: 13.5 }}>
        {'Nothing to review yet \u2014 no documents have been uploaded or extracted for this return.'}
      </div>
    );
  }

  // Real segregation-of-duties: a staff member can't verify or correct
  // fields on their own personal return.
  const isOwnReturn = ret.clientId === user.id;
  const canAct = user.role !== 'seasonal' && user.role !== 'client' && !isOwnReturn;

  async function markVerified(field) {
    setSaving(true);
    try {
      await api.correctField(field.id, field.value, user.name);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(field) {
    setDraft(field.value.replace(/[^0-9.]/g, ''));
    setEditingId(field.id);
  }

  async function saveCorrection(field) {
    const num = parseFloat(draft);
    const formatted = isNaN(num) ? field.value : `$${num.toLocaleString()}`;
    setSaving(true);
    try {
      await api.correctField(field.id, formatted, user.name);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedField ? '1fr 380px' : '1fr', gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, marginBottom: 14, background: 'var(--ai-bg)', color: 'var(--ai)', padding: '8px 12px', borderRadius: 8, fontWeight: 600 }}>
          Click any field to see its source document and how the value was derived.
        </div>
        <Card style={{ overflow: 'hidden' }}>
          {fields.map((f, i) => (
            <button key={f.id} className="focus-ring" onClick={() => { setSelectedId(f.id); setEditingId(null); }} style={{
              width: '100%', textAlign: 'left', border: 'none',
              padding: '14px 18px', borderBottom: i < fields.length - 1 ? '1px solid var(--line)' : 'none',
              cursor: 'pointer', background: selectedField && selectedField.id === f.id ? 'var(--ai-bg)' : 'transparent',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 5 }}>{f.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AffordanceTag field={f} />
                  {f.verifiedBy && <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>{f.corrected ? 'corrected' : 'by'} {f.verifiedBy}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{f.value}</div>
                {f.confidence != null && <div style={{ marginTop: 4 }}><ConfidenceMeter value={f.confidence} /></div>}
              </div>
            </button>
          ))}
        </Card>
      </div>

      {selectedField && (
        <Card style={{ padding: 18, position: 'sticky', top: 16, height: 'fit-content' }} key={selectedField.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Trace this value</div>
            <button className="focus-ring" onClick={() => { setSelectedId(null); setEditingId(null); }} style={{ background: 'none', border: 'none', color: 'var(--ink-40)', fontSize: 15 }}>{'\u00d7'}</button>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{selectedField.label}</div>

          {editingId === selectedField.id ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-40)' }}>$</span>
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  className="mono focus-ring"
                  style={{ fontSize: 18, fontWeight: 600, border: '1.5px solid var(--ai)', borderRadius: 6, padding: '4px 8px', width: 140 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button disabled={saving} className="focus-ring" onClick={() => saveCorrection(selectedField)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{saving ? 'Saving…' : 'Save correction'}</button>
                <button className="focus-ring" onClick={() => setEditingId(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 12.5, fontWeight: 600 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{selectedField.value}</div>
              {selectedField.corrected && <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>(was {selectedField.originalValue})</span>}
              {canAct && selectedField.editable && !selectedField.locked && (
                <button className="focus-ring" onClick={() => startEdit(selectedField)} style={{ background: 'none', border: 'none', color: 'var(--ai)', fontSize: 12, fontWeight: 600 }}>{'\u270E'} Edit</button>
              )}
            </div>
          )}

          {doc ? (
            <>
              <div style={{ background: 'var(--paper-dim)', borderRadius: 8, padding: 12, marginBottom: 12, position: 'relative' }}>
                <svg width="100%" height="90" viewBox="0 0 300 90">
                  <rect x="4" y="4" width="292" height="82" rx="6" fill="#fff" stroke="var(--line-strong)" />
                  <rect x="18" y="16" width="120" height="8" rx="2" fill="var(--line)" />
                  <rect x="18" y="32" width="180" height="8" rx="2" fill="var(--line)" />
                  <rect x="200" y="52" width="80" height="20" rx="3" fill="var(--ai-bg)" stroke="var(--ai)" strokeWidth="1.5" />
                  <text x="240" y="65" fontSize="9" textAnchor="middle" fill="var(--ai)" fontFamily="IBM Plex Mono" fontWeight="600">{selectedField.region}</text>
                  <path className="trace-line" d="M240,52 C240,20 260,10 285,8" />
                </svg>
                <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 6 }}>{doc.name} {'\u00b7'} page {selectedField.page || 1}</div>
              </div>
              <button className="focus-ring" onClick={() => viewer.open(doc, selectedField.region, selectedField.page, selectedField.value)} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
                {'\uD83D\uDCC4'} {doc.name} {'\u2192'}
              </button>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--ink-40)', background: 'var(--paper-dim)', borderRadius: 8, padding: 12, marginBottom: 14 }}>No source document {'\u2014'} this value was {selectedField.source === 'client-entered' ? 'entered directly by the client' : 'set manually by the preparer'}.</div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>How this was calculated</div>
          <div style={{ fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.5, marginBottom: 14 }}>{selectedField.transform}</div>

          {selectedField.confidence != null && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>AI confidence</div>
              <ConfidenceMeter value={selectedField.confidence} />
            </>
          )}

          {selectedField.verified ? (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--verified)', background: 'var(--verified-bg)', borderRadius: 8, padding: '9px 12px', fontWeight: 600 }}>
              {'\u2713'} {selectedField.corrected ? 'Corrected' : 'Verified'}{selectedField.verifiedBy ? ` by ${selectedField.verifiedBy}` : ''}
            </div>
          ) : !selectedField.locked && (
            !canAct ? (
              <div style={{ marginTop: 16, padding: '9px 12px', borderRadius: 8, background: 'var(--locked-bg)', color: 'var(--ink-40)', fontSize: 12, textAlign: 'center' }}>
                {user.role === 'client'
                  ? 'Your preparer will verify this field \u2014 no action needed from you.'
                  : isOwnReturn
                    ? 'You can\u2019t verify or correct fields on your own return \u2014 this needs another reviewer.'
                    : 'Seasonal staff can view but not verify fields \u2014 ask your reviewing CPA.'}
              </div>
            ) : (
              <button disabled={saving} className="focus-ring" onClick={() => markVerified(selectedField)} style={{ marginTop: 16, width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{saving ? 'Saving…' : 'Mark as verified'}</button>
            )
          )}
        </Card>
      )}
    </div>
  );
}
