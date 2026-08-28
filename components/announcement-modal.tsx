"use client";

import { useRef, useState } from "react";

interface AnnouncementModalProps {
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    description: string;
    imageUrl: string | null;
  }) => Promise<boolean>;
}

const css = `
.am-overlay{position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);animation:amFade .2s;padding:16px}
@keyframes amFade{from{opacity:0}to{opacity:1}}
.am-card{width:100%;max-width:400px;max-height:88dvh;overflow-y:auto;border-radius:22px;background:#151A30;border:1px solid rgba(94,234,212,.12);box-shadow:0 24px 64px rgba(0,0,0,.6);animation:amUp .3s cubic-bezier(.16,1,.3,1);padding:18px}
@keyframes amUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.am-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.am-title{font-family:'Space Grotesk',system-ui;font-size:17px;font-weight:700;color:var(--text-main)}
.am-x{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-dim);cursor:pointer;font-size:16px}
.am-x:hover{color:var(--text-main)}
.am-label{font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin:14px 2px 8px}
.am-input{width:100%;padding:11px 12px;border-radius:11px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-main);font-size:14px;outline:none;font-family:inherit}
.am-input:focus{border-color:var(--accent-dim)}
.am-input::placeholder{color:var(--text-dim)}
.am-textarea{width:100%;padding:11px 12px;border-radius:11px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-main);font-size:14px;outline:none;font-family:inherit;resize:vertical;min-height:90px;line-height:1.4}
.am-textarea:focus{border-color:var(--accent-dim)}
.am-textarea::placeholder{color:var(--text-dim)}
.am-img-drop{width:100%;min-height:150px;border:2px dashed var(--line);border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-dim);font-size:13px;transition:.15s;overflow:hidden;flex-direction:column;gap:8px;background:var(--bg-panel)}
.am-img-drop:hover{border-color:var(--accent-dim);color:var(--text-main)}
.am-img-drop.done{border-color:var(--accent);border-style:solid}
.am-img-drop img{width:100%;height:100%;object-fit:cover;margin:0}
.am-preview-wrap{width:100%;height:150px;position:relative}
.am-preview-x{position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
.am-preview-x:hover{background:rgba(0,0,0,.8)}
.am-actions{display:flex;gap:10px;margin-top:16px}
.am-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}
.am-cancel{background:var(--bg-panel-2);color:var(--text-dim)}
.am-cancel:hover{color:var(--text-main)}
.am-send{background:var(--accent);color:#0B1B20}
.am-send:disabled{opacity:.4;cursor:default}
.am-err{color:#f87171;font-size:12px;margin-top:8px;text-align:center}
`;

export function AnnouncementModal({ onClose, onCreate }: AnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function compressImage(file: File, maxDim: number, quality: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("blob")); return; }
          resolve(new File([blob], "img.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("img"));
      img.src = url;
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr("Foto zu groß (max 5 MB)."); return; }
    setUploading(true);
    setErr("");
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setErr(data?.error ?? "Upload fehlgeschlagen."); return; }
      setImageUrl(data.url as string);
    } catch {
      setErr("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    const t = title.trim();
    if (!t) { setErr("Bitte gib einen Titel ein."); return; }
    setErr("");
    setSending(true);
    const ok = await onCreate({ title: t, description: description.trim(), imageUrl });
    setSending(false);
    if (ok) onClose();
  }

  return (
    <>
      <style>{css}</style>
      <div className="am-overlay" onClick={onClose}>
        <div className="am-card" onClick={(e) => e.stopPropagation()}>
          <div className="am-head">
            <div className="am-title">Ankündigung</div>
            <button className="am-x" onClick={onClose}>✕</button>
          </div>

          <div className="am-label">Bild (optional)</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleFile(e)} />
          {imageUrl ? (
            <div className="am-preview-wrap">
              <img src={imageUrl} alt="Vorschau" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
              <button className="am-preview-x" onClick={() => setImageUrl(null)}>✕</button>
            </div>
          ) : (
            <button
              type="button"
              className="am-img-drop"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Lädt hoch..." : "+ Bild hinzufügen"}
            </button>
          )}

          <div className="am-label">Titel</div>
          <input className="am-input" value={title} maxLength={100} placeholder="Titel der Ankündigung" onChange={(e) => setTitle(e.target.value)} autoFocus />

          <div className="am-label">Beschreibung</div>
          <textarea className="am-textarea" value={description} maxLength={1000} placeholder="Beschreibe deine Ankündigung..." onChange={(e) => setDescription(e.target.value)} />

          {err && <div className="am-err">{err}</div>}

          <div className="am-actions">
            <button className="am-btn am-cancel" onClick={onClose}>Abbrechen</button>
            <button className="am-btn am-send" disabled={sending || uploading} onClick={() => void submit()}>Absenden</button>
          </div>
        </div>
      </div>
    </>
  );
}
