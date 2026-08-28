"use client";

import { useRef, useState } from "react";
import type { User } from "@/lib/types";

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

const MOODS = [
  { label: "Zeit", icon: "✔", color: "#5EEAD4", glow: "rgba(94,234,212,.3)" },
  { label: "Kein Bock", icon: "✘", color: "#F87171", glow: "rgba(248,113,113,.3)" },
  { label: "Beschäftigt", icon: "●", color: "#F2C879", glow: "rgba(242,200,121,.3)" },
  { label: "Später", icon: "⏳", color: "#B79CF2", glow: "rgba(183,156,242,.3)" },
];

const VACATION_PRESETS = [
  { label: "Zuhause", icon: "🏠" },
  { label: "Im Urlaub", icon: "✈️" },
  { label: "Wochenende", icon: "🎉" },
  { label: "Abwesend", icon: "🚫" },
];

export function ProfileModal({ user, onClose, onUpdated }: ProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState(user.status);
  const [vacation, setVacation] = useState(user.vacation);
  const [customStatus, setCustomStatus] = useState(user.customStatus ?? "");
  const [profileImage, setProfileImage] = useState<string | null>(user.profileImage);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Foto zu groß (max 5 MB).");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImage(file, 400, 0.8);
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Upload fehlgeschlagen."); return; }
      setProfileImage(data.url);
    } catch {
      setError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function compressImage(file: File, maxDim: number, quality: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Compress failed"));
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")); };
      img.src = url;
    });
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name darf nicht leer sein."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), profileImage, status, vacation, customStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Fehler beim Speichern."); return; }
      onUpdated(data.user);
      onClose();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  const colors = avatarGradient(user.name);

  return (
    <>
      <style>{modalCss}</style>
      <div className="pm-overlay" onClick={onClose}>
        <div className="pm-card" onClick={(e) => e.stopPropagation()}>
          <div className="pm-header">
            <button className="pm-close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m18 6-12 12"/><path d="m6 6 12 12"/></svg>
            </button>
            <h2>Profil</h2>
            <button className="pm-save-top" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <span className="pm-save-spinner" /> : "✓"}
            </button>
          </div>

          <div className="pm-body">
            {/* Avatar */}
            <div className="pm-avatar-section">
              <div className="pm-avatar-ring">
                <div className="pm-avatar" style={{ background: profileImage ? undefined : `linear-gradient(135deg,${colors[0]},${colors[1]})` }}>
                  {profileImage ? <img src={profileImage} alt="" className="pm-avatar-img" /> : <span className="pm-avatar-text">{user.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}</span>}
                </div>
                <button className="pm-camera" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <span className="pm-camera-spinner" /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ position: "fixed", top: -9999, left: -9999, opacity: 0, width: 1, height: 1 }} onChange={(e) => void handleImageUpload(e)} />
              <div className="pm-avatar-name">{name || "Unbekannt"}</div>
              {customStatus && <div className="pm-avatar-status">"{customStatus}"</div>}
            </div>

            {/* Sections */}
            <div className="pm-sections">
              {/* Name */}
              <div className="pm-section">
                <div className="pm-section-icon">👤</div>
                <div className="pm-section-content">
                  <label>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Dein Name" />
                </div>
              </div>

              {/* Status Text */}
              <div className="pm-section">
                <div className="pm-section-icon">💭</div>
                <div className="pm-section-content">
                  <label>Status</label>
                  <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} maxLength={120} placeholder="Wie fühlst du dich?" />
                </div>
              </div>

              {/* Stimmung */}
              <div className="pm-section">
                <div className="pm-section-icon">🎭</div>
                <div className="pm-section-content">
                  <label>Stimmung</label>
                  <div className="pm-moods">
                    {MOODS.map((m) => {
                      const active = status === m.label;
                      return (
                        <button key={m.label} className={`pm-mood-btn ${active ? "on" : ""}`} style={active ? { borderColor: m.color, color: m.color, boxShadow: `0 0 12px ${m.glow}` } : undefined} onClick={() => setStatus(active ? "" : m.label)}>
                          <span style={active ? { color: m.color } : undefined}>{m.icon}</span> {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Erreichbarkeit */}
              <div className="pm-section">
                <div className="pm-section-icon">📍</div>
                <div className="pm-section-content">
                  <label>Erreichbarkeit</label>
                  <div className="pm-vacation">
                    {VACATION_PRESETS.map((v) => {
                      const active = vacation === v.label;
                      return (
                        <button key={v.label} className={`pm-vac-btn ${active ? "on" : ""}`} onClick={() => setVacation(active ? "" : v.label)}>
                          <span>{v.icon}</span> {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="pm-error">{error}</div>}
          </div>

          <div className="pm-footer">
            <button className="pm-cancel" onClick={onClose}>Abbrechen</button>
            <button className="pm-save" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function avatarGradient(name: string): [string, string] {
  const colors: [string, string][] = [
    ["#F2C879", "#E88F5F"], ["#5EEAD4", "#2FA599"], ["#B79CF2", "#7C5CD1"],
    ["#F27E9C", "#D14E75"], ["#7EC8F2", "#4E8FD1"], ["#F2AB7E", "#D17A4E"],
    ["#9CF2C0", "#5CD18A"], ["#F2E27E", "#D1BE4E"],
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

const modalCss = `
.pm-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);animation:pmFadeIn .2s;padding-bottom:10vh}
.pm-card{width:100%;max-width:380px;max-height:90dvh;overflow-y:auto;border-radius:22px;background:#151A30;border:1px solid rgba(94,234,212,.08);box-shadow:0 24px 64px rgba(0,0,0,.6);animation:pmSlideUp .35s cubic-bezier(.16,1,.3,1)}
.pm-card::-webkit-scrollbar{width:0}
.pm-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 6px;position:sticky;top:0;background:#151A30;z-index:1}
.pm-header h2{font-family:'Space Grotesk',system-ui;font-size:17px;font-weight:700;color:#EDEFFA;position:absolute;left:50%;transform:translateX(-50%)}
.pm-close,.pm-save-top{width:36px;height:36px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:.15s}
.pm-close{background:rgba(255,255,255,.06);color:#8A90B8}
.pm-close:hover{background:rgba(255,255,255,.1);color:#EDEFFA}
.pm-save-top{background:linear-gradient(135deg,#5EEAD4,#2FA599);color:#0B1B20;font-weight:700;font-size:16px}
.pm-save-top:hover{transform:scale(1.05)}
.pm-save-top:disabled{opacity:.3}
.pm-save-spinner{width:14px;height:14px;border:2px solid rgba(0,0,0,.2);border-top-color:#0B1B20;border-radius:50%;animation:pmSpin .6s linear infinite}
.pm-body{padding:0 18px 8px;display:flex;flex-direction:column;gap:12px}
.pm-avatar-section{display:flex;flex-direction:column;align-items:center;gap:6px;padding:2px 0 6px}
.pm-avatar-ring{position:relative}
.pm-avatar{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid rgba(94,234,212,.2);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.pm-avatar-img{width:100%;height:100%;object-fit:cover}
.pm-avatar-text{font-family:'Space Grotesk',system-ui;font-size:28px;font-weight:700;color:#0D1026}
.pm-camera{position:absolute;bottom:0;right:0;width:28px;height:28px;border-radius:50%;border:3px solid #151A30;background:linear-gradient(135deg,#5EEAD4,#2FA599);color:#0D1026;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;box-shadow:0 4px 12px rgba(94,234,212,.3)}
.pm-camera:hover{transform:scale(1.1)}
.pm-camera:disabled{opacity:.4}
.pm-camera-spinner{width:12px;height:12px;border:2px solid rgba(0,0,0,.2);border-top-color:#0B1B20;border-radius:50%;animation:pmSpin .6s linear infinite}
.pm-avatar-name{font-family:'Space Grotesk',system-ui;font-size:17px;font-weight:700;color:#EDEFFA}
.pm-avatar-status{font-size:12.5px;color:#5EEAD4;font-style:italic}

.pm-sections{display:flex;flex-direction:column;gap:0}
.pm-section{display:flex;gap:10px;padding:9px 10px;border-radius:12px;transition:background .12s}
.pm-section:hover{background:rgba(255,255,255,.02)}
.pm-section-icon{font-size:16px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border-radius:9px;flex-shrink:0;margin-top:1px}
.pm-section-content{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
.pm-section-content label{font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8A90B8;font-family:'Space Grotesk',system-ui}
.pm-section-content input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:8px 12px;color:#EDEFFA;font-size:13.5px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.pm-section-content input:focus{border-color:rgba(94,234,212,.3);box-shadow:0 0 0 3px rgba(94,234,212,.06)}
.pm-section-content input::placeholder{color:#4B5180}

.pm-moods{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.pm-mood-btn{display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:#8A90B8;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
.pm-mood-btn:hover{border-color:rgba(255,255,255,.12);color:#EDEFFA}
.pm-mood-btn.on{background:rgba(255,255,255,.04)}
.pm-vacation{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.pm-vac-btn{display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);color:#8A90B8;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
.pm-vac-btn:hover{border-color:rgba(255,255,255,.12);color:#EDEFFA}
.pm-vac-btn.on{background:rgba(94,234,212,.06);border-color:rgba(94,234,212,.2);color:#5EEAD4}

.pm-error{padding:10px 14px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.1);font-size:13px;color:#f87171}

.pm-footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 18px 16px;border-top:1px solid rgba(255,255,255,.04)}
.pm-cancel{padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:transparent;color:#8A90B8;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;font-family:inherit}
.pm-cancel:hover{color:#EDEFFA;border-color:rgba(255,255,255,.15)}
.pm-save{padding:10px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#5EEAD4,#2FA599);color:#0B1B20;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;box-shadow:0 4px 16px rgba(94,234,212,.2)}
.pm-save:hover{box-shadow:0 6px 24px rgba(94,234,212,.35);transform:translateY(-1px)}
.pm-save:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}

@keyframes pmFadeIn{from{opacity:0}to{opacity:1}}
@keyframes pmSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes pmSpin{to{transform:rotate(360deg)}}
`;
