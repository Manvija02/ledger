import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { Card, StatusPill, UrgencyDot } from '../components/Shared';
import { useUser } from '../UserContext';

export default function CPADashboard() {
  const { user, getReturnHref } = useUser();
  const navigate = useNavigate();
  const effectiveFilter = user.role === 'admin' ? 'team' : 'mine';

  const [tasks, setTasks] = useState(null);
  const [returns, setReturns] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    api.listMyTasks(effectiveFilter === 'team' ? 'all' : user.id).then(setTasks).catch(e => setLoadError(e.message));
    api.listReturns().then(setReturns).catch(e => setLoadError(e.message));
  }, [effectiveFilter, user.id]);

  const relevantTasks = useMemo(() => {
    if (!tasks) return [];
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...tasks].sort((a, b) => order[a.urgency] - order[b.urgency] || new Date(a.due) - new Date(b.due));
  }, [tasks]);

  const myReturns = useMemo(() => {
    if (!returns) return [];
    return returns.filter(r => effectiveFilter === 'mine' ? (r.preparer === user.name || r.reviewer === user.name) : true);
  }, [returns, effectiveFilter, user.name]);

  const critCount = (tasks || []).filter(t => t.urgency === 'critical').length;
  const QUEUE_CAP = 10;
  const [showAllTasks, setShowAllTasks] = useState(false);
  const visibleTasks = showAllTasks ? relevantTasks : relevantTasks.slice(0, QUEUE_CAP);

  function openReturn(ret) {
    navigate(getReturnHref(ret.id));
  }

  if (loadError) return <div style={{ padding: 40, color: 'var(--blocked)' }}>Couldn't load dashboard: {loadError}</div>;
  if (!tasks || !returns) return <div style={{ padding: 40, color: 'var(--ink-40)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1180, margin: '0 auto' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div className="serif" style={{ fontSize: 25, fontWeight: 600 }}>{user.role === 'reviewer' ? 'Review queue' : 'What needs you today'}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-40)', fontWeight: 600 }}>
            {user.role === 'admin' ? 'Showing firm-wide activity' : 'Showing your assigned work only'}
          </span>
        </div>
      </div>
      <div style={{ color: 'var(--ink-70)', fontSize: 13.5, marginBottom: 24 }}>
        {critCount > 0 ? <span style={{ color: 'var(--blocked)', fontWeight: 600 }}>{critCount} item{critCount > 1 ? 's' : ''} at risk of missing a deadline. </span> : null}
        Ranked by urgency, not by when it arrived.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
            Priority queue {relevantTasks.length > QUEUE_CAP && !showAllTasks && `\u2014 showing top ${QUEUE_CAP} of ${relevantTasks.length}`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleTasks.map(t => {
              const ret = returns.find(r => r.id === t.return_id);
              if (!ret) return null;
              return (
                <Card key={t.id} onClick={() => openReturn(ret)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ marginTop: 4 }}><UrgencyDot level={t.urgency} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-40)', marginTop: 2 }}>{ret.client} {'\u00b7'} {ret.type} {'\u00b7'} due {t.due}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 4 }}>{t.reason}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 10.5, color: t.urgency === 'critical' ? 'var(--blocked)' : 'var(--ink-40)', fontWeight: 700, textTransform: 'uppercase' }}>{t.urgency}</span>
                  </div>
                </Card>
              );
            })}
            {relevantTasks.length > QUEUE_CAP && (
              <button className="focus-ring" onClick={() => setShowAllTasks(!showAllTasks)} style={{ padding: '10px 0', fontSize: 12.5, fontWeight: 600, color: 'var(--ai)', background: 'none', border: 'none', textAlign: 'left' }}>
                {showAllTasks ? 'Show fewer' : `Show all ${relevantTasks.length} \u2192`}
              </button>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>{effectiveFilter === 'mine' ? 'My returns' : 'All returns'} ({myReturns.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myReturns.map(r => (
              <Card key={r.id} onClick={() => openReturn(r)} style={{ padding: '11px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.client}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{r.docsCount} docs {'\u00b7'} due {r.dueDate}</div>
                  </div>
                  <StatusPill stage={r.stage} small />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
