"use client";

import { useState } from "react";
import { getDeviceId } from "@/lib/device";
import type { User } from "@/lib/types";

interface RegistrationFormProps {
  onRegistered: (user: User) => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const YEARS = Array.from({ length: 80 }, (_, i) => String(2026 - i));

export function RegistrationForm({ onRegistered }: RegistrationFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [loginName, setLoginName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmedName = loginName.trim();
    if (!trimmedName) { setError("Bitte gib deinen Namen ein."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Anmeldung fehlgeschlagen."); return; }
      window.localStorage.setItem("familie:user", JSON.stringify({ name: trimmedName }));
      onRegistered(data.user);
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Bitte gib deinen Namen ein."); return; }
    if (!day || !month || !year) { setError("Bitte gib dein Geburtstag vollständig ein."); return; }
    const monthNum = MONTHS.indexOf(month) + 1;
    const birthday = `${day.padStart(2, "0")}.${String(monthNum).padStart(2, "0")}.${year}`;
    setSubmitting(true);
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, birthday, deviceId: getDeviceId() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Registrierung fehlgeschlagen."); return; }
      window.localStorage.setItem("familie:user", JSON.stringify({ name: trimmedName, birthday }));
      onRegistered(data.user);
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{regCss}</style>
      <div className="reg-root">
        {/* Ambient glows */}
        <div className="reg-glow reg-glow-1" />
        <div className="reg-glow reg-glow-2" />
        <div className="reg-glow reg-glow-3" />

        <div className="reg-card">
          {/* Logo */}
          <div className="reg-logo-area">
            <div className="reg-logo-ring">
              <div className="reg-logo">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
            </div>
            <h1 className="reg-title">Familien-Chat</h1>
            <p className="reg-sub">Dein privater Raum für die Familie</p>
          </div>

          <div className="reg-tabs">
            <button type="button" className={`reg-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(null); }}>Anmelden</button>
            <button type="button" className={`reg-tab ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setError(null); }}>Registrieren</button>
          </div>

          {mode === "login" ? (
            <form onSubmit={(e) => void handleLoginSubmit(e)} className="reg-form">
              <div className="reg-field">
                <label htmlFor="reg-login-name">Dein Name</label>
                <div className="reg-input-wrap">
                  <svg className="reg-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="reg-login-name"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    maxLength={80}
                    autoFocus
                    required
                    placeholder="Dein Name"
                  />
                </div>
              </div>

              {error && <div className="reg-error">{error}</div>}

              <button type="submit" disabled={submitting} className="reg-btn">
                {submitting ? (
                  <span className="reg-btn-loading">
                    <span className="reg-spinner" />
                    Wird angemeldet…
                  </span>
                ) : (
                  <span className="reg-btn-content">
                    Anmelden
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </span>
                )}
              </button>

              <p className="reg-hint">Zugang bleibt dauerhaft auf diesem Gerät gespeichert.</p>
            </form>
          ) : (
          <form onSubmit={(e) => void handleRegisterSubmit(e)} className="reg-form">
            {/* Name */}
            <div className="reg-field">
              <label htmlFor="reg-name">Wie heißt du?</label>
              <div className="reg-input-wrap">
                <svg className="reg-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="reg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  autoFocus
                  required
                  placeholder="Dein Name"
                />
              </div>
            </div>

            {/* Geburtstag */}
            <div className="reg-field">
              <label>Dein Geburtstag</label>
              <div className="reg-row3">
                <div className="reg-select-wrap">
                  <select value={day} onChange={(e) => setDay(e.target.value)}>
                    <option value="">Tag</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <svg className="reg-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
                <div className="reg-select-wrap">
                  <select value={month} onChange={(e) => setMonth(e.target.value)}>
                    <option value="">Monat</option>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <svg className="reg-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
                <div className="reg-select-wrap">
                  <select value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="">Jahr</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <svg className="reg-select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
            </div>

            {error && <div className="reg-error">{error}</div>}

            <button type="submit" disabled={submitting} className="reg-btn">
              {submitting ? (
                <span className="reg-btn-loading">
                  <span className="reg-spinner" />
                  Wird gespeichert…
                </span>
              ) : (
                <span className="reg-btn-content">
                  Weiter
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              )}
            </button>

            <p className="reg-hint">Zugang bleibt dauerhaft auf diesem Gerät gespeichert.</p>
          </form>
          )}
        </div>
      </div>
    </>
  );
}

const regCss = `
.reg-root{position:relative;display:flex;min-height:100dvh;align-items:center;justify-content:center;overflow:hidden;background:#12162B;padding:20px}
.reg-glow{position:absolute;border-radius:50%;pointer-events:none;filter:blur(120px)}
.reg-glow-1{width:600px;height:600px;top:-200px;right:-200px;background:radial-gradient(circle,#5EEAD4,transparent 70%);opacity:.1}
.reg-glow-2{width:500px;height:500px;bottom:-200px;left:-150px;background:radial-gradient(circle,#F2C879,transparent 70%);opacity:.07}
.reg-glow-3{width:300px;height:300px;top:40%;left:50%;background:radial-gradient(circle,#B79CF2,transparent 70%);opacity:.05}
.reg-card{position:relative;width:100%;max-width:400px;padding:40px 32px 32px;border-radius:24px;background:linear-gradient(180deg,#191F38 0%,#151A30 100%);border:1px solid rgba(42,49,88,.6);box-shadow:0 32px 80px rgba(0,0,0,.5),0 0 0 1px rgba(94,234,212,.03)}
.reg-logo-area{display:flex;flex-direction:column;align-items:center;margin-bottom:32px}
.reg-logo-ring{width:76px;height:76px;border-radius:22px;background:linear-gradient(135deg,rgba(94,234,212,.12),rgba(242,200,121,.08));padding:3px;margin-bottom:20px;box-shadow:0 8px 32px rgba(94,234,212,.15)}
.reg-logo{width:100%;height:100%;border-radius:19px;background:linear-gradient(135deg,#5EEAD4,#2FA599);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(94,234,212,.3)}
.reg-title{font-family:'Space Grotesk',system-ui;font-size:24px;font-weight:700;color:#EDEFFA;letter-spacing:.02em}
.reg-sub{font-size:13px;color:#8A90B8;margin-top:6px}
.reg-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;background:rgba(29,35,66,.55);padding:5px;border-radius:14px;border:1px solid rgba(42,49,88,.5)}
.reg-tab{border:none;background:transparent;color:#8A90B8;font-size:13px;font-weight:600;padding:10px;border-radius:10px;cursor:pointer;transition:all .2s;font-family:inherit}
.reg-tab.active{background:linear-gradient(135deg,#5EEAD4,#2FA599);color:#0B1B20;box-shadow:0 4px 14px rgba(94,234,212,.2)}
.reg-tab:not(.active):hover{color:#EDEFFA}
.reg-form{display:flex;flex-direction:column;gap:20px}
.reg-field label{display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8A90B8;margin-bottom:9px;font-family:'Space Grotesk',system-ui}
.reg-input-wrap{position:relative;display:flex;align-items:center}
.reg-input-icon{position:absolute;left:14px;color:#4B5180;pointer-events:none}
.reg-input-wrap input{width:100%;background:rgba(29,35,66,.7);border:1px solid rgba(42,49,88,.7);border-radius:14px;padding:13px 16px 13px 40px;color:#EDEFFA;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.reg-input-wrap input:focus{border-color:rgba(94,234,212,.4);box-shadow:0 0 0 3px rgba(94,234,212,.08)}
.reg-input-wrap input::placeholder{color:#4B5180}
.reg-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.reg-select-wrap{position:relative}
.reg-select-wrap select{width:100%;appearance:none;background:rgba(29,35,66,.7);border:1px solid rgba(42,49,88,.7);border-radius:14px;padding:13px 30px 13px 14px;color:#EDEFFA;font-size:14px;outline:none;cursor:pointer;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.reg-select-wrap select:focus{border-color:rgba(94,234,212,.4);box-shadow:0 0 0 3px rgba(94,234,212,.08)}
.reg-select-wrap select option{background:#151A30;color:#EDEFFA}
.reg-select-arrow{position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#4B5180}
.reg-error{padding:12px 16px;border-radius:12px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.12);font-size:13px;color:#f87171}
.reg-btn{width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#5EEAD4,#2FA599);color:#0B1B20;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 6px 24px rgba(94,234,212,.2);font-family:inherit;position:relative;overflow:hidden}
.reg-btn:hover{box-shadow:0 8px 32px rgba(94,234,212,.35);transform:translateY(-1px)}
.reg-btn:active{transform:translateY(0) scale(.98)}
.reg-btn:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}
.reg-btn-content{display:flex;align-items:center;justify-content:center;gap:8px}
.reg-btn-loading{display:flex;align-items:center;justify-content:center;gap:10px}
.reg-spinner{width:16px;height:16px;border:2px solid rgba(11,27,32,.25);border-top-color:#0B1B20;border-radius:50%;animation:regSpin .6s linear infinite}
.reg-hint{text-align:center;font-size:11px;color:#4B5180;margin-top:2px}
@keyframes regSpin{to{transform:rotate(360deg)}}
`;
