import { useState } from 'react';
import { useUser, DEMO_ACCOUNTS } from '../UserContext';

// Named/described here (not in data.js) purely as display labels for the
// demo picker — logging in still goes through a real /auth/login call.
const ACCOUNT_LABELS = [
  { email: 'maria@example.com', name: 'Maria Alvarez', desc: 'Client — active return' },
  { email: 'david@example.com', name: 'David Chen', desc: 'Client — first-time filer' },
  { email: 'jordan@firm.com', name: 'Jordan Blake', desc: 'Senior Preparer' },
  { email: 'sam@firm.com', name: 'Sam Okafor', desc: 'Reviewing CPA' },
  { email: 'lee@firm.com', name: 'Lee Park', desc: 'Firm Administrator' },
  { email: 'ren@firm.com', name: 'Ren Osei', desc: 'Seasonal Preparer' },
];

export default function Login() {
  const { loginAs, authError } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await loginAs(email, password); } finally { setBusy(false); }
  }

  async function quickLogin(acctEmail) {
    setBusy(true);
    try {
      const acct = DEMO_ACCOUNTS.find(a => a.email === acctEmail);
      await loginAs(acct.email, acct.password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-dim)', padding: 20 }}>
      <div style={{ width: 380, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 28, boxShadow: 'var(--shadow)' }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Ledger</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-40)', marginBottom: 20 }}>Sign in to your account</div>

        <form onSubmit={submit} style={{ marginBottom: 20 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 8, fontSize: 13.5, boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 8, fontSize: 13.5, boxSizing: 'border-box' }} />
          {authError && <div style={{ color: 'var(--blocked)', fontSize: 12, marginBottom: 8 }}>{authError}</div>}
          <button disabled={busy} type="submit" style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
          Or try a demo account
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ACCOUNT_LABELS.map(a => (
            <button key={a.email} disabled={busy} onClick={() => quickLogin(a.email)} className="focus-ring"
              style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-dim)', fontSize: 12.5 }}>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ color: 'var(--ink-40)', fontSize: 11 }}>{a.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-40)', marginTop: 14, textAlign: 'center' }}>
          Demo accounts all use password: password123
        </div>
      </div>
    </div>
  );
}
