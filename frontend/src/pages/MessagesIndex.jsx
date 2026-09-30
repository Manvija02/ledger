import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { Card, Avatar, Tag } from '../components/Shared';
import { useViewer } from '../components/Layout';
import { useUser } from '../UserContext';
import MessagesPanel from '../components/MessagesPanel';

const LINK_ICON = { document: '\uD83D\uDCC4', field: '\u2726', task: '\u2611\uFE0F' };

export default function MessagesIndex() {
  const { user } = useUser();
  const navigate = useNavigate();
  const viewer = useViewer();
  const [returns, setReturns] = useState(null);
  const [threads, setThreads] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    api.listReturns().then(setReturns).catch(e => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!returns || user.role === 'client') return;
    const mine = returns.filter(r => r.preparer === user.name || r.reviewer === user.name);
    Promise.all(mine.map(r => api.listMessages(r.id).then(msgs => ({ r, msgs }))))
      .then(results => {
        const threadMap = new Map();
        results.forEach(({ r, msgs }) => {
          msgs.forEach(m => {
            const key = `${r.id}:${m.linkedTo.type}:${m.linkedTo.id}`;
            if (!threadMap.has(key)) threadMap.set(key, { returnId: r.id, ret: r, linkedTo: m.linkedTo, messages: [] });
            threadMap.get(key).messages.push(m);
          });
        });
        setThreads(Array.from(threadMap.values()));
      })
      .catch(e => setLoadError(e.message));
  }, [returns, user.role, user.name]);

  if (loadError) return <div style={{ padding: 40, color: 'var(--blocked)' }}>Couldn't load messages: {loadError}</div>;
  if (!returns) return <div style={{ padding: 40, color: 'var(--ink-40)' }}>Loading…</div>;

  if (user.role === 'client') {
    const myReturn = returns.find(r => r.clientId === user.id);
    if (!myReturn) return <div style={{ padding: 40, fontSize: 13.5, color: 'var(--ink-40)' }}>No messages yet.</div>;
    return (
      <div style={{ padding: '24px 36px', maxWidth: 700, margin: '0 auto' }} className="fade-in">
        <MessagesPanel returnId={myReturn.id} ret={myReturn} />
      </div>
    );
  }

  if (!threads) return <div style={{ padding: 40, color: 'var(--ink-40)' }}>Loading…</div>;

  async function openLinkedItem(returnId, linkedTo) {
    if (linkedTo.type === 'document') {
      try { const doc = await api.getDocument(linkedTo.id); viewer.open(doc); } catch { /* ignore */ }
      return;
    }
    if (linkedTo.type === 'field') {
      navigate(`/returns/${returnId}/review`, { state: { fieldId: linkedTo.id } });
      return;
    }
    navigate(`/returns/${returnId}/documents`);
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800, margin: '0 auto' }} className="fade-in">
      <div className="serif" style={{ fontSize: 23, fontWeight: 600, marginBottom: 18 }}>Messages across your returns</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {threads.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>No messages yet.</div>}
        {threads.map((thread, ti) => {
          const r = thread.ret;
          const last = thread.messages[thread.messages.length - 1];
          return (
            <Card key={ti} style={{ overflow: 'hidden' }}>
              <button
                onClick={() => openLinkedItem(r.id, thread.linkedTo)}
                className="focus-ring"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper-dim)', borderBottom: '1px solid var(--line)', border: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-70)' }}>
                  <span>{r.client}</span>
                  <span style={{ color: 'var(--ink-40)' }}>{'\u00b7'}</span>
                  <span>{LINK_ICON[thread.linkedTo.type] || '\uD83D\uDCAC'}</span>
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: 10.5, color: 'var(--ink-40)' }}>{thread.linkedTo.type}</span>
                  {thread.linkedTo.label}
                  <span style={{ color: 'var(--ai)' }}>{'\u2192'}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>Next action: <b style={{ color: 'var(--ink)' }}>{last.ownerNext}</b></span>
              </button>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {thread.messages.map(m => (
                  <div key={m.id} style={{ paddingLeft: 10, borderLeft: m.visibility === 'internal' ? '3px solid var(--ink-40)' : '3px solid var(--ai)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={m.from} initials={m.from.split(' ').map(x => x[0]).join('')} size={20} />
                        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{m.from}</span>
                        {m.visibility === 'internal' && <Tag color="var(--ink-70)" bg="var(--locked-bg)" icon={"\uD83D\uDD12"}>Internal note</Tag>}
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--ink-40)' }}>{m.at}</span>
                    </div>
                    <div style={{ fontSize: 13.5 }}>{m.text}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
