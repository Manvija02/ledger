import { useState, useEffect } from 'react';
import { STATUS_META } from '../data';

export function Avatar({ name, initials, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600, flexShrink: 0 }} title={name}>
      {initials}
    </div>
  );
}

// Challenge 08 — Clickable vs Editable: one consistent affordance system used everywhere.
export function AffordanceTag({ field }) {
  if (field.locked) return <Tag color="var(--ink-40)" bg="var(--locked-bg)" icon={"\uD83D\uDD12"}>Locked by preparer</Tag>;
  if (field.source === 'client-entered') return <Tag color="var(--ink-70)" bg="#EEEDE8" icon={"\u270E"}>Client-entered</Tag>;
  if (field.verified) return <Tag color="var(--verified)" bg="var(--verified-bg)" icon={"\u2713"}>Verified</Tag>;
  if (field.aiGenerated) return <Tag color="var(--ai)" bg="var(--ai-bg)" icon={"\u2726"}>{'AI-extracted \u00b7 needs review'}</Tag>;
  return <Tag color="var(--ink-70)" bg="#EEEDE8" icon={"\u270E"}>Editable</Tag>;
}

export function Tag({ children, color, bg, icon }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color, background: bg, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}><span>{icon}</span>{children}</span>;
}

export function ConfidenceMeter({ value }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const color = value > 0.85 ? 'var(--verified)' : value > 0.7 ? 'var(--pending)' : 'var(--blocked)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--paper-dim)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span className="mono" style={{ fontSize: 11.5, color, fontWeight: 600 }}>{pct}%</span>
    </div>
  );
}

export function StatusPill({ stage, small }) {
  const m = STATUS_META[stage];
  return <span style={{ fontSize: small ? 11 : 12.5, fontWeight: 600, color: m.color, background: m.bg, padding: small ? '3px 9px' : '4px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}>{stage}</span>;
}

export function UrgencyDot({ level }) {
  const c = level === 'critical' ? 'var(--blocked)' : level === 'high' ? 'var(--pending)' : level === 'medium' ? 'var(--ai)' : 'var(--ink-40)';
  return <span className={level === 'critical' ? 'pulse-dot' : ''} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />;
}

export function Card({ children, style, onClick }) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } }) : undefined}
      style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow)', ...(interactive ? { outlineOffset: 2 } : {}), ...style }}
      className={interactive ? 'focus-ring' : undefined}
    >
      {children}
    </div>
  );
}

export function FilterBtn({ active, children, onClick }) {
  return <button className="focus-ring" onClick={onClick} style={{ fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 20, border: '1px solid var(--line)', background: active ? 'var(--ink)' : '#fff', color: active ? '#fff' : 'var(--ink-70)' }}>{children}</button>;
}

export function DocumentViewer({ doc, highlightRegion, targetPage, highlightValue, onClose }) {
  const [activePage, setActivePage] = useState(1);

  useEffect(() => {
    if (doc) setActivePage(targetPage || 1);
  }, [doc, targetPage]);

  useEffect(() => {
    if (!doc) return;
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [doc, onClose]);

  if (!doc) return null;

  // Only the field actually being traced gets a real value (passed in from
  // wherever this was opened) \u2014 every other line is an honest generic
  // placeholder rather than a fabricated dollar amount that could belong to
  // a completely different return. Showing a specific-but-wrong number is
  // worse than admitting "we don't have this one."
  const mockLines = [
    { label: 'Employer / Payer', page: 1, isMeta: true },
    { label: 'Box 1', page: 1 },
    { label: 'Box 2', page: 1 },
    { label: 'Box 1a', page: Math.min(2, doc.pages) },
    { label: 'Receipt total', page: Math.min(2, doc.pages) },
  ];
  const linesOnActivePage = mockLines.filter(l => l.page === activePage);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,32,59,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: '#fff', borderRadius: 12, width: 480, maxWidth: '90vw', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{doc.name}</div>
          <button className="focus-ring" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--ink-40)' }}>{'\u00d7'}</button>
        </div>
        <div style={{ background: 'var(--paper-dim)', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{doc.type} {'\u00b7'} simulated render</div>
            {doc.pages > 1 && (
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: doc.pages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className="focus-ring"
                    onClick={() => setActivePage(p)}
                    style={{
                      width: 24, height: 24, borderRadius: 5, fontSize: 11, fontWeight: 700,
                      border: p === activePage ? '1.5px solid var(--ai)' : '1px solid var(--line-strong)',
                      background: p === activePage ? 'var(--ai-bg)' : '#fff',
                      color: p === activePage ? 'var(--ai)' : 'var(--ink-40)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--line-strong)', borderRadius: 6, padding: 14, minHeight: 100 }}>
            {linesOnActivePage.length === 0 && (
              <>
                <div style={{ height: 8, width: '55%', background: 'var(--line)', borderRadius: 2, marginBottom: 10 }} />
                <div style={{ height: 8, width: '75%', background: 'var(--line)', borderRadius: 2, marginBottom: 10 }} />
                <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 8 }}>No extracted fields land on this page.</div>
              </>
            )}
            {linesOnActivePage.map((l, i) => {
              const isHighlighted = highlightRegion && l.label === highlightRegion;
              const displayValue = isHighlighted && highlightValue
                ? highlightValue
                : (l.isMeta ? 'On file' : null);
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', borderRadius: 5,
                  background: isHighlighted ? 'var(--ai-bg)' : 'transparent',
                  border: isHighlighted ? '1.5px solid var(--ai)' : '1.5px solid transparent',
                  marginBottom: 4,
                }}>
                  <span className="mono" style={{ fontSize: 11.5, color: isHighlighted ? 'var(--ai)' : 'var(--ink-40)', fontWeight: isHighlighted ? 700 : 500 }}>{l.label}</span>
                  {displayValue ? (
                    <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{displayValue}</span>
                  ) : (
                    <span style={{ height: 8, width: 70, background: 'var(--line)', borderRadius: 2 }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 8 }}>Page {activePage} of {doc.pages}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-40)', marginTop: 10 }}>
          <span>{doc.uploadedBy}</span><span>{doc.uploadedAt}</span>
        </div>
      </div>
    </div>
  );
}
