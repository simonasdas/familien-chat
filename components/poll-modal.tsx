"use client";

import { useState } from "react";

interface PollModalProps {
  meName: string;
  onClose: () => void;
  onCreate: (payload: {
    question: string;
    options: string[];
    anonymous: boolean;
    singleChoice: boolean;
  }) => Promise<boolean>;
}

const css = `
.pmz-overlay{position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);animation:pmzFade .2s;padding:16px}
@keyframes pmzFade{from{opacity:0}to{opacity:1}}
.pmz-card{width:100%;max-width:400px;max-height:88dvh;overflow-y:auto;border-radius:22px;background:#151A30;border:1px solid rgba(94,234,212,.12);box-shadow:0 24px 64px rgba(0,0,0,.6);animation:pmzUp .3s cubic-bezier(.16,1,.3,1);padding:18px}
@keyframes pmzUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.pmz-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.pmz-title{font-family:'Space Grotesk',system-ui;font-size:17px;font-weight:700;color:var(--text-main)}
.pmz-x{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-dim);cursor:pointer;font-size:16px}
.pmz-x:hover{color:var(--text-main)}
.pmz-label{font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin:14px 2px 8px}
.pmz-input{width:100%;padding:11px 12px;border-radius:11px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-main);font-size:14px;outline:none;font-family:inherit}
.pmz-input:focus{border-color:var(--accent-dim)}
.pmz-input::placeholder{color:var(--text-dim)}
.pmz-opt-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.pmz-opt-input{flex:1;padding:10px 12px;border-radius:11px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-main);font-size:14px;outline:none;font-family:inherit}
.pmz-opt-input:focus{border-color:var(--accent-dim)}
.pmz-del{width:34px;height:34px;border-radius:9px;border:none;background:transparent;color:var(--text-dim);cursor:pointer;font-size:16px;flex-shrink:0}
.pmz-del:hover{color:#f87171}
.pmz-add{width:100%;padding:10px;border-radius:11px;border:1px dashed var(--line);background:transparent;color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.pmz-add:hover{border-color:var(--accent-dim)}
.pmz-toggle{display:flex;align-items:center;justify-content:space-between;padding:12px 2px;border-top:1px solid var(--line);cursor:pointer}
.pmz-toggle:first-of-type{border-top:none}
.pmz-toggle-label{font-size:13px;color:var(--text-main)}
.pmz-switch{width:42px;height:24px;border-radius:20px;background:var(--bg-panel-2);position:relative;transition:.15s;flex-shrink:0}
.pmz-switch.on{background:var(--accent)}
.pmz-switch::after{content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.15s}
.pmz-switch.on::after{left:20px}
.pmz-actions{display:flex;gap:10px;margin-top:16px}
.pmz-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}
.pmz-cancel{background:var(--bg-panel-2);color:var(--text-dim)}
.pmz-cancel:hover{color:var(--text-main)}
.pmz-send{background:var(--accent);color:#0B1B20}
.pmz-send:disabled{opacity:.4;cursor:default}
.pmz-count{font-size:11px;color:var(--text-dim);margin-top:6px;text-align:right}
.pmz-err{color:#f87171;font-size:12px;margin-top:8px;text-align:center}
`;

export function PollModal({ meName, onClose, onCreate }: PollModalProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [singleChoice, setSingleChoice] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }

  function addOption() {
    if (options.length >= 12) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(i: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function submit() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) { setErr("Bitte gib eine Frage ein."); return; }
    if (opts.length < 2) { setErr("Mindestens 2 Antworten."); return; }
    setErr("");
    setSending(true);
    const ok = await onCreate({ question: q, options: opts, anonymous, singleChoice });
    setSending(false);
    if (ok) onClose();
  }

  const filled = options.filter((o) => o.trim()).length;

  return (
    <>
      <style>{css}</style>
      <div className="pmz-overlay" onClick={onClose}>
        <div className="pmz-card" onClick={(e) => e.stopPropagation()}>
          <div className="pmz-head">
            <div className="pmz-title">Umfrage erstellen</div>
            <button className="pmz-x" onClick={onClose}>✕</button>
          </div>

          <div className="pmz-label">Frage</div>
          <input className="pmz-input" value={question} maxLength={200} placeholder="z.B. Was sollen wir heute kochen?" onChange={(e) => setQuestion(e.target.value)} autoFocus />

          <div className="pmz-label">Antworten</div>
          {options.map((o, i) => (
            <div className="pmz-opt-row" key={i}>
              <input className="pmz-opt-input" value={o} maxLength={100} placeholder={`Antwort ${i + 1}`} onChange={(e) => updateOption(i, e.target.value)} />
              {options.length > 2 && <button className="pmz-del" onClick={() => removeOption(i)}>✕</button>}
            </div>
          ))}
          {options.length < 12 && (
            <button className="pmz-add" onClick={addOption}>+ Antwort hinzufügen</button>
          )}
          <div className="pmz-count">{filled} von {options.length}</div>

          <div className="pmz-toggle" onClick={() => setAnonymous(!anonymous)}>
            <span className="pmz-toggle-label">Anonym</span>
            <span className={`pmz-switch ${anonymous ? "on" : ""}`} />
          </div>
          <div className="pmz-toggle" onClick={() => setSingleChoice(!singleChoice)}>
            <span className="pmz-toggle-label">Single-Choice (eine Antwort)</span>
            <span className={`pmz-switch ${singleChoice ? "on" : ""}`} />
          </div>

          {err && <div className="pmz-err">{err}</div>}

          <div className="pmz-actions">
            <button className="pmz-btn pmz-cancel" onClick={onClose}>Abbrechen</button>
            <button className="pmz-btn pmz-send" disabled={sending} onClick={() => void submit()}>Senden</button>
          </div>
        </div>
      </div>
    </>
  );
}
