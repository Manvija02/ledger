import { useState, useRef } from 'react';
import * as api from '../api';

// Real upload: the file is actually sent to the backend and stored, then
// extraction is triggered so a real (or, without an API key, clearly-
// labeled mock) set of fields comes back — no more fabricated session data.
export default function UploadDropzone({ returnId, docType = 'W-2', compact, onUploaded }) {
  const inputRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | processing | done | error
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setState('processing');
    setError(null);
    try {
      const doc = await api.uploadDocument(returnId, docType, file);
      try { await api.extractDocument(doc.id); } catch { /* extraction failing shouldn't block the upload from showing as received */ }
      setState('done');
      if (onUploaded) onUploaded(doc);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div style={{ padding: compact ? '16px 18px' : '20px', borderRadius: 10, background: 'var(--verified-bg)', border: '1px solid var(--verified)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{'\u2713'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--verified)' }}>{'\u201c'}{fileName}{'\u201d'} received</div>
          <div style={{ fontSize: 12, color: 'var(--ink-70)' }}>Uploaded and sent for extraction.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => state !== 'processing' && inputRef.current && inputRef.current.click()}
      style={{ padding: compact ? '18px 16px' : '32px 20px', borderRadius: 10, textAlign: 'center', border: '1.5px dashed var(--line-strong)', cursor: state === 'processing' ? 'default' : 'pointer', background: '#fff' }}
    >
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFile} />
      {state === 'processing' ? (
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ai)' }}>Uploading {fileName}{'\u2026'}</div>
      ) : (
        <>
          <div style={{ fontSize: compact ? 20 : 28, marginBottom: 8 }}>{'\u2191'}</div>
          <div style={{ fontWeight: 600, fontSize: compact ? 13 : 14, marginBottom: 4 }}>Drag a file here, or click to browse</div>
          <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>PDF, JPG, or PNG {'\u00b7'} W-2, 1099, or any tax document</div>
          {error && <div style={{ fontSize: 12, color: 'var(--blocked)', marginTop: 6 }}>{error}</div>}
        </>
      )}
    </div>
  );
}
