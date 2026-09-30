import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ROLE_NAV } from '../data'; // static per-role nav config, not fabricated business data
import * as api from '../api';
import { Avatar } from './Shared';
import { useUser } from '../UserContext';

export default function Sidebar() {
  const { user, recents } = useUser();
  const navigate = useNavigate();
  const items = ROLE_NAV[user.role];

  const [myReturnId, setMyReturnId] = useState(null);
  useEffect(() => {
    if (user.role !== 'client') return;
    api.listReturns().then(rows => {
      const mine = rows.find(r => r.clientId === user.id);
      setMyReturnId(mine ? mine.id : null);
    }).catch(() => {});
  }, [user.id, user.role]);

  function hrefFor(k) {
    if (k === 'return') {
      return myReturnId ? `/returns/${myReturnId}/overview` : '/home';
    }
    if (k === 'home') return '/home';
    if (k === 'dashboard') return '/dashboard';
    return `/${k}`;
  }

  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--paper-dim)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 20px' }}>
        <span className="serif" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}>Ledger</span>
      </div>
      <div style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => (
          <NavLink key={it.k} to={hrefFor(it.k)} className="focus-ring" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', border: 'none',
            background: isActive ? '#fff' : 'transparent',
            color: isActive ? 'var(--ink)' : 'var(--ink-70)',
            fontWeight: isActive ? 600 : 500, fontSize: 13.5,
            padding: '9px 12px', borderRadius: 8,
            boxShadow: isActive ? 'var(--shadow)' : 'none',
          })}>
            <span>{it.icon}</span>{it.label}
          </NavLink>
        ))}
      </div>
      {recents.length > 0 && (
        <div style={{ marginTop: 18, padding: '0 20px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink-40)', textTransform: 'uppercase', marginBottom: 8 }}>Recently viewed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recents.slice(0, 4).map((r, i) => (
              <button key={i} className="focus-ring" onClick={() => navigate(r.href)} style={{ background: 'none', border: 'none', textAlign: 'left', fontSize: 12.5, color: 'var(--ink-70)', padding: '3px 0' }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 'auto', padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: 10.5, color: 'var(--ink-40)' }}>Signed in as</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Avatar name={user.name} initials={user.initials} size={26} />
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{user.name}</div>
        </div>
      </div>
    </div>
  );
}
