import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { Card, Avatar, Tag, FilterBtn } from './Shared';
import { useViewer } from './Layout';
import { useUser } from '../UserContext';

const LINK_ICON = { document: '\uD83D\uDCC4', field: '\u2726', task: '\u2611\uFE0F', general: '\uD83D\uDCAC' };

// Challenge 02 — Client & CPA Collaboration
// Messages are grouped into threads by what they're about (linkedTo), so a
// back-and-forth about one document/field/task reads as one conversation.
// `ret` is passed in from the return detail layout, which already fetched
// it — no need for a second lookup here.
export default function MessagesPanel({ returnId, ret }) {
  const { user } = useUser();
  const viewer = useViewer();
  const navigate = useNavigate();
  const isStaff = user.role !== 'client';
  const [view, setView] = useState(isStaff ? 'all' : 'client');
  const [draft, setDraft] = useState('');
  const [composeVisibility, setComposeVisibility] = useState('client');
  const [msgs, setMsgs] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api.listMessages(returnId).then(setMsgs).catch(e => setLoadError(e.message));
  }, [returnId]);

  useEffect(() => { load(); }, [load]);

  if (loadError) return <div style={{ color: 'var(--blocked)' }}>Couldn't load messages: {loadError}</div>;
  if (!msgs) return <div style={{ color: 'var(--ink-40)' }}>Loading…</div>;

  const visible = msgs.filter(m => view === 'all' || m.visibility === view);

  const threadMap = new Map();
  visible.forEach(m => {
    const key = `${m.linkedTo.type}:${m.linkedTo.id}`;
    if (!threadMap.has(key)) threadMap.set(key, { linkedTo: m.linkedTo, messages: [] });
    threadMap.get(key).messages.push(m);
  });
  const threads = Array.from(threadMap.values());

  async function openLinkedItem(linkedTo) {
    if (linkedTo.type === 'document') {
      try { const doc = await api.getDocument(linkedTo.id); viewer.open(doc); } catch { /* ignore */ }
      return;
    }
    if (linkedTo.type === 'field') {
      navigate(`/returns/${returnId}/review`, { state: { fieldId: linkedTo.id } });
      return;
    }
    if (linkedTo.type === 'general') return;
    navigate(`/returns/${returnId}/documents`);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !ret) return;
    const visibility = isStaff ? composeVisibility : 'client';
    const ownerNext = !isStaff
      ? ret.preparer
      : (visibility === 'internal' ? (ret.reviewer || ret.preparer) : ret.client);
    setSending(true);
    try {
      await api.postMessage(returnId, { visibility, text, linked_type: 'general', linked_id: 'general', linked_label: 'General', owner_next: ownerNext });
      setDraft('');
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {isStaff && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <FilterBtn active={view === 'all'} onClick={() => setView('all')}>All</FilterBtn>
          <FilterBtn active={view === 'client'} onClick={() => setView('client')}>Client-visible</FilterBtn>
          <FilterBtn active={view === 'internal'} onClick={() => setView('internal')}>Internal only</FilterBtn>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {threads.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>No messages here.</div>}
        {threads.map((thread, ti) => {
          const last = thread.messages[thread.messages.length - 1];
          return (
            <Card key={ti} style={{ overflow: 'hidden' }}>
              <button
                onClick={() => openLinkedItem(thread.linkedTo)}
                className="focus-ring"
                style={{ width: '100%', cursor: thread.linkedTo.type === 'general' ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper-dim)', borderBottom: '1px solid var(--line)', border: 'none', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-70)' }}>
                  <span>{LINK_ICON[thread.linkedTo.type] || '\uD83D\uDCAC'}</span>
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: 10.5, color: 'var(--ink-40)' }}>{thread.linkedTo.type}</span>
                  {thread.linkedTo.label}
                  {thread.linkedTo.type !== 'general' && <span style={{ color: 'var(--ai)' }}>{'\u2192'}</span>}
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
      <div style={{ marginTop: 16 }}>
        {isStaff && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <FilterBtn active={composeVisibility === 'client'} onClick={() => setComposeVisibility('client')}>Send to client</FilterBtn>
            <FilterBtn active={composeVisibility === 'internal'} onClick={() => setComposeVisibility('internal')}>Internal note</FilterBtn>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            placeholder={isStaff ? 'Write a message or internal note\u2026' : 'Write a message to your preparer\u2026'}
            className="focus-ring"
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }}
          />
          <button disabled={sending} className="focus-ring" onClick={sendMessage} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{sending ? 'Sending…' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
