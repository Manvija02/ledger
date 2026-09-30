import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { Card } from '../components/Shared';
import { useUser } from '../UserContext';
import DocumentsList from '../components/DocumentsList';

export default function DocumentsIndex() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [returns, setReturns] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    api.listReturns().then(setReturns).catch(e => setLoadError(e.message));
  }, []);

  if (loadError) return <div style={{ padding: 40, color: 'var(--blocked)' }}>Couldn't load: {loadError}</div>;
  if (!returns) return <div style={{ padding: 40, color: 'var(--ink-40)' }}>Loading…</div>;

  if (user.role === 'client') {
    const myReturn = returns.find(r => r.clientId === user.id);
    if (!myReturn) return <div style={{ padding: 40, fontSize: 13.5, color: 'var(--ink-40)' }}>No documents yet.</div>;
    return (
      <div style={{ padding: '24px 36px', maxWidth: 900, margin: '0 auto' }} className="fade-in">
        <DocumentsList returnId={myReturn.id} />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1000, margin: '0 auto' }} className="fade-in">
      <div className="serif" style={{ fontSize: 23, fontWeight: 600, marginBottom: 6 }}>All documents</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-40)', marginBottom: 18 }}>Pick a return to view its document library.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {returns.map(r => (
          <Card key={r.id} onClick={() => navigate(`/returns/${r.id}/documents`)} style={{ padding: 14, cursor: 'pointer' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.client}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{r.docsCount} documents</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
