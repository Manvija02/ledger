import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as api from '../api';
import { useUser } from '../UserContext';

const TAB_LABELS = { overview: 'Status', review: 'Review & Traceability', documents: 'Documents', messages: 'Messages', ai: 'AI Insights' };
const SCREEN_LABELS = { dashboard: 'Dashboard', home: 'Home', returns: 'All Returns', documents: 'Documents', messages: 'Messages', team: 'Team & Roles' };

export default function Breadcrumbs() {
  const { user } = useUser();
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean); // e.g. ['returns', 'ret_1001', 'review']
  const returnId = parts[0] === 'returns' && parts[1] ? parts[1] : null;

  const [retName, setRetName] = useState(null);
  useEffect(() => {
    if (!returnId) { setRetName(null); return; }
    let cancelled = false;
    api.getReturn(returnId).then(r => { if (!cancelled) setRetName(r.client); }).catch(() => {});
    return () => { cancelled = true; };
  }, [returnId]);

  const rootLabel = user.role === 'client' ? 'Home' : 'Dashboard';
  const rootHref = user.role === 'client' ? '/home' : '/dashboard';
  const trail = [{ label: rootLabel, href: rootHref }];

  if (parts[0] === 'returns' && parts[1]) {
    trail.push({ label: 'All Returns', href: '/returns' });
    trail.push({ label: retName || parts[1], href: `/returns/${parts[1]}/overview` });
    if (parts[2]) trail.push({ label: TAB_LABELS[parts[2]] || parts[2], href: location.pathname });
  } else if (parts[0] === 'returns') {
    trail.push({ label: 'All Returns', href: '/returns' });
  } else if (parts[0] && SCREEN_LABELS[parts[0]] && parts[0] !== rootHref.slice(1)) {
    trail.push({ label: SCREEN_LABELS[parts[0]], href: `/${parts[0]}` });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-70)', flexWrap: 'wrap' }}>
      {trail.map((t, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: 'var(--ink-40)' }}>/</span>}
          {i === trail.length - 1
            ? <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{t.label}</span>
            : <Link className="focus-ring" to={t.href} style={{ color: 'var(--ink-70)' }}>{t.label}</Link>}
        </span>
      ))}
    </div>
  );
}
