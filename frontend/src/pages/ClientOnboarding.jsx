import { useState, useEffect } from 'react';
import { Card } from '../components/Shared';
import UploadDropzone from '../components/UploadDropzone';
import { useUser } from '../UserContext';
import * as api from '../api';

const QUESTIONS = [
  { key: 'joint', text: 'Are you filing individually or jointly?', yesLabel: 'Joint', noLabel: 'Individual' },
  { key: 'selfEmployment', text: 'Did you have self-employment income in 2025?', yesLabel: 'Yes', noLabel: 'No' },
  { key: 'rental', text: 'Do you own rental property?', yesLabel: 'Yes', noLabel: 'No' },
];

export default function ClientOnboarding({ onFinish }) {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [myReturn, setMyReturn] = useState(null);

  useEffect(() => {
    api.listReturns().then(rows => setMyReturn(rows.find(r => r.clientId === user.id) || null)).catch(() => {});
  }, [user.id]);

  function answer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  // What we'll say is "likely needed" on the upload step, driven by the
  // actual answers instead of a fixed generic list.
  const predictions = ['W-2 \u2014 already covered by this upload'];
  if (answers.selfEmployment === 'yes') predictions.push('1099-NEC \u2014 for your self-employment income');
  if (answers.rental === 'yes') predictions.push('Schedule E \u2014 for your rental property');
  if (answers.selfEmployment !== 'yes' && answers.rental !== 'yes') predictions.push('1099-B or 1099-INT \u2014 if you have any investment or interest income');

  const steps = [
    { title: `Welcome, ${user.name.split(' ')[0]}.`, body: 'We\u2019ll help you file your 2025 return. This takes about 3 minutes to set up \u2014 then you\u2019ll know exactly what to do next.' },
    { title: 'Tell us the basics', body: 'A few quick questions so we know which forms apply to you.' },
    { title: 'Upload your first document', body: 'Start with your W-2 or 1099 \u2014 we\u2019ll pull the numbers automatically and show you what we found.' },
  ];
  return (
    <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px' }} className="fade-in">
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {steps.map((s, i) => <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? 'var(--ai)' : 'var(--line)' }} />)}
      </div>
      <div className="serif" style={{ fontSize: 30, fontWeight: 600, marginBottom: 10 }}>{steps[step].title}</div>
      <div style={{ fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.6, marginBottom: 28 }}>{steps[step].body}</div>

      {step === 1 && (
        <Card style={{ padding: 20, marginBottom: 24 }}>
          {QUESTIONS.map((q, i) => (
            <div key={q.key} style={{ padding: '12px 0', borderBottom: i < QUESTIONS.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{q.text}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 'yes', label: q.yesLabel }, { v: 'no', label: q.noLabel }].map(opt => {
                  const selected = answers[q.key] === opt.v;
                  return (
                    <button
                      key={opt.v}
                      className="focus-ring"
                      onClick={() => answer(q.key, opt.v)}
                      style={{
                        padding: '6px 16px', borderRadius: 8, fontSize: 12.5,
                        border: selected ? '1.5px solid var(--ai)' : '1px solid var(--line)',
                        background: selected ? 'var(--ai-bg)' : '#fff',
                        color: selected ? 'var(--ai)' : 'var(--ink-70)',
                        fontWeight: selected ? 700 : 500,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      )}
      {step === 2 && (
        <>
          <div style={{ marginBottom: 16 }}>
            {myReturn ? <UploadDropzone returnId={myReturn.id} /> : null}
          </div>
          <Card style={{ padding: 16, marginBottom: 24, background: 'var(--ai-bg)', border: 'none' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{'Based on what you told us, you\u2019ll likely also need'}</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-70)', lineHeight: 1.7 }}>
              {predictions.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </Card>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button className="focus-ring" onClick={() => step < steps.length - 1 ? setStep(step + 1) : onFinish()} style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 22px', fontSize: 13.5, fontWeight: 600 }}>
          {step < steps.length - 1 ? 'Continue' : 'Go to my dashboard'}
        </button>
      </div>
    </div>
  );
}
