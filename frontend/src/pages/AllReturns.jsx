import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { STATUS_STAGES } from '../data'; // just the enum of stage names for the filter dropdown — not fabricated business data
import { Card, StatusPill, UrgencyDot, Tag } from '../components/Shared';
import { useUser } from '../UserContext';

export default function AllReturns() {
  const navigate = useNavigate();
  const { getReturnHref } = useUser();
  const [returns, setReturns] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => {
    api.listReturns().then(setReturns).catch(e => setLoadError(e.message));
  }, []);

  if (loadError) return <div style={{ padding: 40, color: 'var(--blocked)' }}>Couldn't load returns: {loadError}</div>;
  if (!returns) return <div style={{ padding: 40, color: 'var(--ink-40)' }}>Loading…</div>;

  const filtered = returns.filter(r =>
    (stageFilter === 'all' || r.stage === stageFilter) &&
    r.client.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }} className="fade-in">
      <div className="serif" style={{ fontSize: 23, fontWeight: 600, marginBottom: 6 }}>All returns ({returns.length})</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${returns.length} returns\u2026`} className="focus-ring" style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }} />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="focus-ring" style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12.5, background: '#fff' }}>
          <option value="all">All stages</option>
          {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 12 }}>{filtered.length} of {returns.length} returns</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.slice(0, 60).map(r => (
          <Card key={r.id} onClick={() => navigate(getReturnHref(r.id))} style={{ padding: '13px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UrgencyDot level={r.urgency} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.client} {r.isStaffPersonal && <Tag color="var(--ai)" bg="var(--ai-bg)" icon={"\uD83D\uDC64"}>Staff personal return</Tag>}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{r.type} {'\u00b7'} {r.docsCount} docs {'\u00b7'} preparer: {r.preparer}</div>
              </div>
            </div>
            <StatusPill stage={r.stage} />
          </Card>
        ))}
        {filtered.length > 60 && (
          <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--ink-40)', textAlign: 'center' }}>
            {'Showing the first 60 of ' + filtered.length + ' matching returns \u2014 narrow your search to see more.'}
          </div>
        )}
      </div>
    </div>
  );
}
