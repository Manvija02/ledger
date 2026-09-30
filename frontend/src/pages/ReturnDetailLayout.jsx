import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import * as api from '../api';
import { StatusPill } from '../components/Shared';
import { useUser } from '../UserContext';

const TABS = [
  { k: 'overview', label: 'Status' },
  { k: 'review', label: 'Review & Traceability' },
  { k: 'documents', label: 'Documents' },
  { k: 'messages', label: 'Messages' },
  { k: 'ai', label: 'AI Insights' },
];

export default function ReturnDetailLayout() {
  const { id } = useParams();
  const [ret, setRet] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { addRecent, setLastTab } = useUser();
  const location = useLocation();

  // Real data now — fetched fresh from the backend on every visit, which is
  // also what keeps Review & Traceability and AI Insights in agreement
  // with each other without any special cross-tab sync: whichever tab you
  // land on just asks the backend for the current truth.
  useEffect(() => {
    let cancelled = false;
    api.getReturn(id)
      .then(r => { if (!cancelled) setRet(r); })
      .catch(e => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!ret) return;
    const currentTab = location.pathname.split('/').pop();
    addRecent({ label: ret.client, icon: '\uD83D\uDCC1', href: location.pathname });
    setLastTab(ret.id, currentTab);
  }, [ret && ret.id, location.pathname]);

  if (loadError) {
    return <div style={{ padding: 40, fontSize: 13.5, color: 'var(--blocked)' }}>Couldn't load return "{id}": {loadError}</div>;
  }
  if (!ret) {
    return <div style={{ padding: 40, fontSize: 13.5, color: 'var(--ink-40)' }}>Loading…</div>;
  }

  return (
    <div style={{ padding: '24px 36px 60px', maxWidth: 1180, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div className="serif" style={{ fontSize: 23, fontWeight: 600 }}>{ret.client}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-40)', marginTop: 2 }}>{ret.type} {'\u00b7'} Tax year {ret.year} {'\u00b7'} {ret.id}</div>
        </div>
        <StatusPill stage={ret.stage} />
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 22 }}>
        {TABS.map(t => (
          <NavLink key={t.k} to={`/returns/${ret.id}/${t.k}`} className="focus-ring" style={({ isActive }) => ({
            padding: '10px 14px', background: 'none', border: 'none', fontSize: 13.5, fontWeight: 600,
            color: isActive ? 'var(--ink)' : 'var(--ink-40)',
            borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
          })}>{t.label}</NavLink>
        ))}
      </div>

      <Outlet context={{ ret }} />
    </div>
  );
}
