import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { STATUS_STAGES, STATUS_META } from '../../data'; // static copy/enum, not fabricated data
import * as api from '../../api';
import { Card } from '../../components/Shared';

// Challenge 06 — Status & Progress
export default function OverviewTab() {
  const { ret } = useOutletContext();
  const navigate = useNavigate();
  const idx = STATUS_STAGES.indexOf(ret.stage);
  const meta = STATUS_META[ret.stage];

  const [hasOpenFlags, setHasOpenFlags] = useState(false);
  useEffect(() => {
    api.listFlags(ret.id).then(flags => setHasOpenFlags(flags.some(f => f.status === 'open'))).catch(() => {});
  }, [ret.id]);

  const nextAction = {
    'Documents Needed': { label: 'Upload the documents we need', tab: 'documents' },
    'In Preparation': { label: 'Continue reviewing extracted values', tab: 'review' },
    'In Review': hasOpenFlags ? { label: 'Resolve open AI flags', tab: 'ai' } : { label: 'Continue review', tab: 'review' },
    'Client Action Needed': { label: 'Respond to the open question', tab: 'messages' },
  }[ret.stage];
  return (
    <div>
      <Card style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>Progress</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STATUS_STAGES.map((s, i) => (
            <span key={s} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                  background: i < idx ? 'var(--verified)' : i === idx ? 'var(--ai)' : 'var(--paper-dim)',
                  color: i <= idx ? '#fff' : 'var(--ink-40)', border: i === idx ? '2px solid var(--ai)' : 'none',
                }}>
                  {i < idx ? '\u2713' : i + 1}
                </div>
                <div style={{ fontSize: 10.5, marginTop: 6, textAlign: 'center', color: i === idx ? 'var(--ink)' : 'var(--ink-40)', fontWeight: i === idx ? 700 : 500 }}>{s}</div>
              </div>
              {i < STATUS_STAGES.length - 1 && <div style={{ flex: 1, height: 2, background: i < idx ? 'var(--verified)' : 'var(--line)', marginBottom: 20 }} />}
            </span>
          ))}
        </div>
      </Card>
      {ret.blocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--blocked-bg)', color: 'var(--blocked)', border: '1px solid var(--blocked)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontWeight: 600, fontSize: 13.5 }}>
          <span style={{ fontSize: 16 }}>{'\u26A0\uFE0F'}</span>
          {'Blocked \u2014 this return cannot move forward until the client responds.'}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginBottom: 6 }}>What's happened</div>
          <div style={{ fontSize: 13 }}>{meta.happened}</div>
        </Card>
        {nextAction ? (
          <button
            className="focus-ring"
            onClick={() => navigate(`/returns/${ret.id}/${nextAction.tab}`)}
            style={{ textAlign: 'left', cursor: 'pointer', padding: 16, borderRadius: 10, background: '#fff', border: '1px solid var(--line)', borderLeft: ret.blocked ? '3px solid var(--blocked)' : '3px solid var(--ai)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginBottom: 6 }}>What's next</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ai)' }}>{ret.blocked ? 'Blocked \u2014 waiting on client-provided document' : nextAction.label} {'\u2192'}</div>
          </button>
        ) : (
          <Card style={{ padding: 16, borderLeft: ret.blocked ? '3px solid var(--blocked)' : '3px solid var(--ai)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginBottom: 6 }}>What's next</div>
            <div style={{ fontSize: 13 }}>{ret.blocked ? 'Blocked \u2014 waiting on client-provided document.' : meta.client}</div>
          </Card>
        )}
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginBottom: 6 }}>Waiting on</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{ret.stage === 'Client Action Needed' ? ret.client : (ret.stage === 'In Review' ? ret.reviewer : ret.preparer)}</div>
        </Card>
      </div>
    </div>
  );
}
