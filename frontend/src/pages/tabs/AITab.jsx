import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import * as api from '../../api';
import { Card, ConfidenceMeter } from '../../components/Shared';
import { useUser } from '../../UserContext';

// Challenge 10 — Trustworthy AI.
// Flags now come from GET /returns/:id/ai-flags, and accept/correct/dismiss
// are real POST /ai/flags/:id calls — accepting a flag genuinely marks its
// linked field verified in the database, which is why Review & Traceability
// shows the same fact without any special sync code.
export default function AITab() {
  const { ret } = useOutletContext();
  const { user } = useUser();
  const navigate = useNavigate();

  const [flags, setFlags] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    api.listFlags(ret.id)
      .then(rows => { setFlags(rows); if (rows[0] && open === null) setOpen(rows[0].id); })
      .catch(e => setLoadError(e.message));
  }, [ret.id]);

  useEffect(() => { load(); }, [load]);

  if (loadError) return <div style={{ fontSize: 13, color: 'var(--blocked)' }}>Couldn't load AI flags: {loadError}</div>;
  if (!flags) return <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>Loading…</div>;
  if (flags.length === 0) return <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>No AI flags on this return right now.</div>;

  const isOwnReturn = ret.clientId === user.id;
  const canAct = user.role !== 'seasonal' && !isOwnReturn;

  if (user.role === 'client') {
    // Client-facing mode: plain language only, no confidence percentages,
    // no correction controls — those are preparer/reviewer judgment calls.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {flags.map(f => (
          <Card key={f.id} style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>{f.kind === 'warning' ? '\u26A0\uFE0F' : '\u2726'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>
                {f.kind === 'warning' ? 'Needs a closer look' : 'Handled automatically'}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-70)', lineHeight: 1.5 }}>{f.clientSummary}</div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  async function accept(flag) {
    setBusyId(flag.id);
    try {
      await api.actOnFlag(flag.id, 'accept');
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(flag) {
    setBusyId(flag.id);
    try {
      await api.actOnFlag(flag.id, 'dismiss');
      load();
    } finally {
      setBusyId(null);
    }
  }

  function correctManually(flag) {
    if (flag.fieldId) {
      navigate(`/returns/${ret.id}/review`, { state: { fieldId: flag.fieldId, autoEdit: true } });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {flags.map(f => {
        const isOpen = open === f.id;
        const status = f.status; // 'open' | 'accepted' | 'corrected' | 'dismissed'
        return (
          <Card key={f.id} style={{ padding: 0, overflow: 'hidden', opacity: status === 'dismissed' ? 0.55 : 1 }}>
            <button className="focus-ring" onClick={() => setOpen(isOpen ? null : f.id)} style={{ width: '100%', textAlign: 'left', padding: 16, background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 16 }}>{f.kind === 'warning' ? '\u26A0\uFE0F' : '\u2726'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {f.title}
                    {status === 'accepted' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--verified)' }}>{'\u2713'} Accepted</span>}
                    {status === 'corrected' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--verified)' }}>{'\u2713'} Corrected</span>}
                    {status === 'dismissed' && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--ink-40)' }}>Dismissed</span>}
                  </div>
                  {f.confidence != null && <div style={{ marginTop: 4 }}><ConfidenceMeter value={f.confidence} /></div>}
                </div>
              </div>
              <span style={{ color: 'var(--ink-40)' }}>{isOpen ? '\u2212' : '+'}</span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 16px 16px' }} className="fade-in">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>Why the AI flagged this</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.7 }}>
                  {f.evidence.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                <div style={{ background: 'var(--ai-bg)', borderRadius: 8, padding: 12, marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', marginBottom: 4 }}>SUGGESTED ACTION</div>
                  <div style={{ fontSize: 13 }}>{f.suggestion}</div>
                </div>
                {status !== 'open' ? (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: status === 'dismissed' ? 'var(--ink-40)' : 'var(--verified)', fontWeight: 600 }}>
                    {status === 'accepted' && `Accepted${f.fieldId ? ' \u2014 linked field marked verified in Review & Traceability' : ''}.`}
                    {status === 'corrected' && 'Corrected \u2014 see Review & Traceability for the new value.'}
                    {status === 'dismissed' && 'Dismissed.'}
                  </div>
                ) : !canAct ? (
                  <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 8, background: 'var(--locked-bg)', color: 'var(--ink-40)', fontSize: 12 }}>
                    {isOwnReturn
                      ? 'You can\u2019t accept, correct, or dismiss flags on your own return \u2014 this needs another reviewer.'
                      : 'Seasonal staff can view AI flags but can\u2019t accept, correct, or dismiss them \u2014 that requires a preparer or reviewer.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button disabled={busyId === f.id} className="focus-ring" onClick={() => accept(f)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}>{busyId === f.id ? 'Working…' : 'Accept & apply'}</button>
                    <button className="focus-ring" onClick={() => correctManually(f)} disabled={!f.fieldId} title={!f.fieldId ? 'No linked field to edit for this flag' : undefined} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 12.5, fontWeight: 600, opacity: f.fieldId ? 1 : 0.4, cursor: f.fieldId ? 'pointer' : 'not-allowed' }}>Correct manually</button>
                    <button disabled={busyId === f.id} className="focus-ring" onClick={() => dismiss(f)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-40)' }}>Dismiss</button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
