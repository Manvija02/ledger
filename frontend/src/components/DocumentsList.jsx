import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { Card, Tag } from './Shared';
import { useViewer } from './Layout';

// Challenge 09 — Complexity Made Navigable (search/filter/hierarchy at scale)
export default function DocumentsList({ returnId }) {
  const viewer = useViewer();
  const [docs, setDocs] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const load = useCallback(() => {
    api.listDocuments(returnId).then(setDocs).catch(e => setLoadError(e.message));
  }, [returnId]);

  useEffect(() => { load(); }, [load]);

  if (loadError) return <div style={{ padding: 20, color: 'var(--blocked)' }}>Couldn't load documents: {loadError}</div>;
  if (!docs) return <div style={{ padding: 20, color: 'var(--ink-40)' }}>Loading…</div>;

  const types = ['all', ...Array.from(new Set(docs.map(d => d.type)))];
  const filtered = docs.filter(d => (typeFilter === 'all' || d.type === typeFilter) && d.name.toLowerCase().includes(q.toLowerCase()));
  const grouped = {};
  filtered.forEach(d => { grouped[d.type] = grouped[d.type] || []; grouped[d.type].push(d); });

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${docs.length} documents\u2026`} className="focus-ring" style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="focus-ring" style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12.5, background: '#fff' }}>
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 14 }}>{filtered.length} of {docs.length} documents</div>
      {Object.keys(grouped).length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: 20 }}>No documents match.</div>}
      {Object.entries(grouped).map(([type, list]) => (
        <div key={type} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{type} ({list.length})</div>
          <Card style={{ overflow: 'hidden' }}>
            {(expanded[type] ? list : list.slice(0, 25)).map((d, i, arr) => (
              <button key={d.id} className="focus-ring" onClick={() => viewer.open(d)} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none', border: 'none', background: 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15 }}>{'\uD83D\uDCC4'}</span>
                  <div>
                    <div style={{ fontSize: 13 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>{d.pages} page{d.pages > 1 ? 's' : ''} {'\u00b7'} {d.uploadedBy} {'\u00b7'} {new Date(d.uploadedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                {d.status === 'flagged' && <Tag color="var(--blocked)" bg="var(--blocked-bg)" icon={"\u26A0"}>Flagged</Tag>}
                {d.status === 'needs-review' && <Tag color="var(--pending)" bg="var(--pending-bg)" icon={"\u25CF"}>Needs review</Tag>}
                {d.status === 'processing' && <Tag color="var(--ai)" bg="var(--ai-bg)" icon={"\u23F3"}>Processing</Tag>}
                {d.status === 'processed' && <Tag color="var(--verified)" bg="var(--verified-bg)" icon={"\u2713"}>Processed</Tag>}
              </button>
            ))}
            {list.length > 25 && (
              <button
                className="focus-ring"
                onClick={() => setExpanded(prev => ({ ...prev, [type]: !prev[type] }))}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 11.5, color: 'var(--ai)', fontWeight: 600, background: 'var(--ai-bg)', border: 'none', borderTop: '1px solid var(--line)' }}
              >
                {expanded[type] ? 'Show fewer' : `Show all ${list.length} in this category ${'\u2192'}`}
              </button>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}
