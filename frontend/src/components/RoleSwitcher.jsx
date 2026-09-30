import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Shared';
import { useUser, DEMO_ACCOUNTS } from '../UserContext';

// Display-only labels for the picker (avatars/subtitles). The actual
// account switch below is a real /auth/login call, not a state swap.
const ACCOUNT_LABELS = [
  { email: 'maria@example.com', name: 'Maria Alvarez', initials: 'MA', firmRole: null },
  { email: 'david@example.com', name: 'David Chen', initials: 'DC', firmRole: null },
  { email: 'jordan@firm.com', name: 'Jordan Blake', initials: 'JB', firmRole: 'Senior Preparer' },
  { email: 'sam@firm.com', name: 'Sam Okafor', initials: 'SO', firmRole: 'Reviewing CPA' },
  { email: 'lee@firm.com', name: 'Lee Park', initials: 'LP', firmRole: 'Firm Administrator' },
  { email: 'ren@firm.com', name: 'Ren Osei', initials: 'RO', firmRole: 'Seasonal Preparer (Level 1)' },
];

export default function RoleSwitcher() {
  const { user, loginAs, logout } = useUser();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function switchUser(label) {
    setSwitching(true);
    try {
      const acct = DEMO_ACCOUNTS.find(a => a.email === label.email);
      const u = await loginAs(acct.email, acct.password);
      setOpen(false);
      navigate(u.role === 'client' ? '/home' : '/dashboard');
    } finally {
      setSwitching(false);
    }
  }

  if (!user) return null;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button className="focus-ring" onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-dim)', border: '1px solid var(--line)', borderRadius: 20, padding: '5px 12px 5px 6px', fontSize: 12.5 }}>
        <Avatar name={user.name} initials={user.initials} size={22} />
        <span style={{ fontWeight: 600 }}>{user.name}</span>
        <span style={{ color: 'var(--ink-40)', fontSize: 11 }}>({user.firmRole || 'Client'})</span>
        <span style={{ color: 'var(--ink-40)' }}>{'\u25be'}</span>
      </button>
      {open && (
        <div className="fade-in" style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow)', width: 280, zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--line)' }}>Switch account</div>
          {ACCOUNT_LABELS.map(a => (
            <button key={a.email} disabled={switching} className="focus-ring" onClick={() => switchUser(a)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: a.email === user.email ? 'var(--paper-dim)' : 'transparent', border: 'none', textAlign: 'left' }}>
              <Avatar name={a.name} initials={a.initials} size={26} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{a.firmRole || 'Client account'}</div>
              </div>
            </button>
          ))}
          <button className="focus-ring" onClick={() => { logout(); setOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, color: 'var(--blocked)', border: 'none', borderTop: '1px solid var(--line)', background: 'transparent' }}>
            Log out
          </button>
          <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--ink-40)', borderTop: '1px solid var(--line)', background: 'var(--paper-dim)' }}>Real login against the FastAPI backend — password: password123</div>
        </div>
      )}
    </div>
  );
}
