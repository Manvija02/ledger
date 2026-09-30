import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATUS_STAGES, STATUS_META } from '../data'; // static enum/copy, not fabricated data
import * as api from '../api';
import { Card, StatusPill } from '../components/Shared';
import UploadDropzone from '../components/UploadDropzone';
import { useUser } from '../UserContext';
import ClientOnboarding from './ClientOnboarding';

export default function ClientHome() {
  const { user, onboarded, setOnboarded } = useUser();
  const navigate = useNavigate();
  const isFirstRun = user.firstRun && !onboarded[user.id];

  const [myReturn, setMyReturn] = useState(null);
  const [docCount, setDocCount] = useState(0);
  const [needsResponse, setNeedsResponse] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (isFirstRun) return;
    api.listReturns()
      .then(rows => {
        const mine = rows.find(r => r.clientId === user.id);
        setMyReturn(mine || null);
        if (mine) {
          api.listDocuments(mine.id).then(docs => setDocCount(docs.length)).catch(() => {});
          api.listMessages(mine.id).then(msgs => setNeedsResponse(msgs.filter(m => m.ownerNext === user.name))).catch(() => {});
        }
      })
      .catch(e => setLoadError(e.message));
  }, [user.id, user.name, isFirstRun]);

  if (isFirstRun) {
    return <ClientOnboarding onFinish={() => setOnboarded(prev => ({ ...prev, [user.id]: true }))} />;
  }
  if (loadError) return <div style={{ padding: 40, color: 'var(--blocked)' }}>Couldn't load your return: {loadError}</div>;
  if (myReturn === null) return <div style={{ padding: 40, fontSize: 13.5, color: 'var(--ink-40)' }}>Loading…</div>;

  const meta = STATUS_META[myReturn.stage];

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '40px 24px' }} className="fade-in">
      <div className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Welcome back, {user.name.split(' ')[0]}.</div>
      <div style={{ color: 'var(--ink-70)', fontSize: 14, marginBottom: 28 }}>{`Here\u2019s where your ${myReturn.year} return stands.`}</div>

      <Card style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 6 }}>{myReturn.type} {'\u00b7'} Tax year {myReturn.year}</div>
            <StatusPill stage={myReturn.stage} />
            <div style={{ fontSize: 14, marginTop: 10, color: 'var(--ink-70)' }}>{meta.client}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Preparer</div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{myReturn.preparer}</div>
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 4 }}>
          {STATUS_STAGES.map((s, i) => {
            const idx = STATUS_STAGES.indexOf(myReturn.stage);
            return <div key={s} title={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? 'var(--ai)' : 'var(--line)' }} />;
          })}
        </div>
      </Card>

      {needsResponse.length > 0 && (
        <Card style={{ padding: 18, marginBottom: 20, borderLeft: '3px solid var(--blocked)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blocked)', marginBottom: 10 }}>Needs your response {'\u00b7'} {needsResponse.length}</div>
          {needsResponse.map(m => (
            <div key={m.id} style={{ fontSize: 13.5, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ color: 'var(--ink-40)', fontSize: 11.5, marginBottom: 3 }}>From {m.from} {'\u00b7'} re: {m.linkedTo.label}</div>
              {m.text}
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {docCount === 0 ? (
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Upload your first document</div>
            <UploadDropzone returnId={myReturn.id} compact onUploaded={() => setDocCount(c => c + 1)} />
          </div>
        ) : (
          <button className="focus-ring" onClick={() => navigate(`/returns/${myReturn.id}/review`)} style={{ textAlign: 'left', padding: 18, borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Review your return {'\u2192'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-70)' }}>See every number and where it came from</div>
          </button>
        )}
        <button className="focus-ring" onClick={() => navigate('/documents')} style={{ textAlign: 'left', padding: 18, borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Your documents {'\u2192'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-70)' }}>{docCount} on file</div>
        </button>
      </div>
    </div>
  );
}
