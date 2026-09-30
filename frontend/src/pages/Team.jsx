import { useState, useEffect } from 'react';
import * as api from '../api';
import { Card, Avatar, Tag } from '../components/Shared';

export default function Team() {
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    api.listUsers().then(setUsers).catch(e => setLoadError(e.message));
  }, []);

  if (loadError) return <div style={{ padding: 40, color: 'var(--blocked)' }}>Couldn't load team: {loadError}</div>;
  if (!users) return <div style={{ padding: 40, color: 'var(--ink-40)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800, margin: '0 auto' }} className="fade-in">
      <div className="serif" style={{ fontSize: 23, fontWeight: 600, marginBottom: 6 }}>Team & roles</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-40)', marginBottom: 18 }}>Each person gets one product shell, scoped by role. Switch the account picker (top right) to see how the same shell adapts for a preparer, reviewer, or client.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.filter(u => u.role !== 'client').map(u => (
          <Card key={u.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={u.name} initials={u.initials} size={30} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{u.firmRole}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
