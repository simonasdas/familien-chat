"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, User } from "@/lib/types";
import { getDeviceId } from "@/lib/device";
import { ProfileModal } from "@/components/profile-modal";
import { EmojiPicker } from "@/components/emoji-picker";
import { PollCard } from "@/components/poll-card";
import { PollModal } from "@/components/poll-modal";
import { AnnouncementModal } from "@/components/announcement-modal";
import { AnnouncementCard } from "@/components/announcement-card";
import { ReactionSheet } from "@/components/reaction-sheet";
import CameraModal from "@/components/camera-modal";

interface FamilyChatProps {
  user: User;
}

const AVATAR_COLORS = [
  ["#F2C879", "#E88F5F"],
  ["#5EEAD4", "#2FA599"],
  ["#B79CF2", "#7C5CD1"],
  ["#F27E9C", "#D14E75"],
  ["#7EC8F2", "#4E8FD1"],
  ["#F2AB7E", "#D17A4E"],
  ["#9CF2C0", "#5CD18A"],
  ["#F2E27E", "#D1BE4E"],
];

function avatarColors(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatTime(createdAt: string) {
  const d = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: string, b: string) {
  const da = new Date(`${a.replace(" ", "T")}Z`);
  const db = new Date(`${b.replace(" ", "T")}Z`);
  return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
}

function formatDateLabel(createdAt: string) {
  const d = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate()) return "Heute";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.getUTCFullYear() === y.getFullYear() && d.getUTCMonth() === y.getMonth() && d.getUTCDate() === y.getDate()) return "Gestern";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

function statusDotColor(status: string): string {
  switch (status) {
    case "Zeit": return "#5EEAD4";
    case "Kein Bock": return "#F87171";
    case "Beschäftigt": return "#F2C879";
    case "Später": return "#B79CF2";
    default: return "#4B5180";
  }
}

export function FamilyChat({ user }: FamilyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioPreviewBlob, setAudioPreviewBlob] = useState<Blob | null>(null);
  const [audioPreviewDur, setAudioPreviewDur] = useState(0);
  const [audioSending, setAudioSending] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [dictateText, setDictateText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User>(user);
  const [reactionMsg, setReactionMsg] = useState<ChatMessage | null>(null);
  const [reactionInfo, setReactionInfo] = useState<{ msgId: number; emoji: string } | null>(null);
  const [viewingMember, setViewingMember] = useState<User | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraSending, setCameraSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPress(msg: ChatMessage) {
    if (pressTimerRef.current) return;
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      setReactionMsg(msg);
    }, 500);
  }
  function cancelPress() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<any | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartedAtRef = useRef(0);
  const abortAudioRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const dictRecognitionRef = useRef<any | null>(null);
  const finalTranscriptRef = useRef("");
  const dictBaseRef = useRef("");
  const seenRef = useRef(0);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Dieser Browser unterstützt keine Audioaufnahme.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      abortAudioRef.current = false;
      audioChunksRef.current = [];
      recStartedAtRef.current = Date.now();
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
        .find((t) => MediaRecorder.isTypeSupported(t)) || "";
      let rec: any;
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        rec = new MediaRecorder(stream);
      }
      rec.ondataavailable = (ev: any) => { if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      rec.onstop = () => {
        if (abortAudioRef.current) {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioPreviewBlob(blob);
        setAudioPreview(url);
        setAudioPreviewDur(Math.max(1, Math.round((Date.now() - recStartedAtRef.current) / 1000)));
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecSec(0);
      setError(null);
      recTimerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
      setRecording(true);
    } catch {
      setError("Zugriff auf Mikrofon verweigert. Erlaube den Zugriff in den Browser-Einstellungen.");
    }
  }

  function stopRecording() {
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    mediaRecorderRef.current = null;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (recording) setRecording(false);
  }

  function cancelRecording() {
    abortAudioRef.current = true;
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    setRecording(false);
    setAudioPreview(null);
    setAudioPreviewBlob(null);
    setAudioPreviewDur(0);
  }

  function cancelAudioPreview() {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(null);
    setAudioPreviewBlob(null);
    setAudioPreviewDur(0);
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; }
  }

  async function sendAudio() {
    if (!audioPreviewBlob || audioSending) return;
    setError(null);
    setAudioSending(true);
    try {
      const fd = new FormData();
      fd.append("file", audioPreviewBlob, `sprachnachricht.${(audioPreviewBlob.type.split("/")[1] || "webm").split(";")[0]}`);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => null);
      if (!up.ok) { setError(upData?.error ?? "Upload fehlgeschlagen."); return; }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: upData.url, deviceId: getDeviceId() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Fehler beim Senden."); return; }
      if (data?.message) { const msg = data.message as ChatMessage; setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]); }
      cancelAudioPreview();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setAudioSending(false);
    }
  }

  async function handleCameraDone(blob: Blob, isVideo: boolean, caption: string) {
    if (cameraSending) return;
    setError(null);
    setCameraSending(true);
    try {
      const ext = isVideo
        ? (blob.type.split("/")[1] || "mp4").split(";")[0]
        : (blob.type.split("/")[1] || "jpeg").split(";")[0];
      const fd = new FormData();
      fd.append("file", blob, `aufnahme.${ext}`);
      const up = await fetch("/api/upload", { method: "POST", body: fd, signal: AbortSignal.timeout(25000) });
      const upData = await up.json().catch(() => null);
      if (!up.ok) { setError(upData?.error ?? "Upload fehlgeschlagen."); setCameraSending(false); return; }
      const payload: Record<string, unknown> = { deviceId: getDeviceId() };
      if (caption.trim()) payload.content = caption.trim();
      if (isVideo) payload.videoUrl = upData.url;
      else payload.imageUrl = upData.url;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Fehler beim Senden."); setCameraSending(false); return; }
      if (data?.message) { const msg = data.message as ChatMessage; setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]); }
      setShowCamera(false);
    } catch { setError("Netzwerkfehler."); } finally { setCameraSending(false); }
  }

  function getRecognition(): any | null {
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }  function startDictate() {
    const Recognition = getRecognition();
    if (!Recognition) {
      setError("Sprach-zu-Text wird von diesem Browser nicht unterstützt (nutze Chrome/Android).");
      return;
    }
    try {
      const rec = new Recognition();
      rec.lang = "de-DE";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      finalTranscriptRef.current = "";
      seenRef.current = 0;
      dictBaseRef.current = draft || "";
      rec.onresult = (ev: any) => {
        let final = "";
        let interim = "";
        for (let i = 0; i < ev.results.length; i++) {
          const data = ev.results[i];
          const tr = data?.[0]?.transcript || "";
          if (data.isFinal) final += tr + " ";
          else interim = tr;
        }
        if (final.trim()) {
          finalTranscriptRef.current = (finalTranscriptRef.current + " " + final.trim()).trim();
          seenRef.current = ev.results.length;
        }
        const combined = (finalTranscriptRef.current + (interim ? " " + interim : "")).trim();
        setDictateText(combined);
        setDraft(dictBaseRef.current ? dictBaseRef.current + " " + combined : combined);
      };
      rec.onerror = () => { try { rec.stop(); } catch {} };
      rec.onend = () => {
        if (dictRecognitionRef.current === rec) {
          try {
            rec.start();
          } catch {
            setDictating(false);
            setDictateText("");
          }
        }
      };
      dictRecognitionRef.current = rec;
      rec.start();
      setDictateText("");
      setDictating(true);
    } catch {
      setDictating(false);
      finalTranscriptRef.current = "";
    }
  }

  function stopDictate() {
    const rec = dictRecognitionRef.current;
    dictRecognitionRef.current = null;
    try {
      rec?.stop();
    } catch {}
    setDictating(false);
    setDictateText("");
    finalTranscriptRef.current = "";
  }

  function loadUsers() {
    fetch("/api/user", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(); const d = await r.json(); if (typeof d.memberCount === "number") setMemberCount(d.memberCount); if (d.users) setAllUsers(d.users as User[]); if (d.user) setCurrentUserData(d.user as User); })
      .catch(() => {});
  }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { const i = setInterval(loadUsers, 10000); return () => clearInterval(i); }, []);

  useEffect(() => {
    let off = false;
    fetch("/api/chat", { cache: "no-store" }).then(async (r) => { if (!r.ok) throw new Error(); const d = await r.json(); if (!off && d.messages) setMessages(d.messages as ChatMessage[]); }).catch(() => {});
    return () => { off = true; };
  }, []);

  useEffect(() => {
    const s = new EventSource("/api/chat/stream");
    s.onopen = () => setConnected(true);
    s.onerror = () => setConnected(false);
    s.onmessage = (e) => { try { const d = JSON.parse(e.data) as { messages: ChatMessage[] }; setMessages(d.messages); setConnected(true); loadUsers(); } catch {} };
    return () => s.close();
  }, []);

  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  function findUserByName(name: string) { return allUsers.find((u) => u.name === name); }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, deviceId: getDeviceId() }), signal: AbortSignal.timeout(20000) });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Fehler beim Senden."); return; }
      setDraft(""); inputRef.current?.focus();
      if (data?.message) { const msg = data.message as ChatMessage; setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]); }
    } catch { setError("Netzwerkfehler."); } finally { setSending(false); }
  }

  async function handleLogout() { await fetch("/api/user", { method: "DELETE" }).catch(() => {}); window.location.reload(); }

  async function handleCreatePoll(payload: { question: string; options: string[]; anonymous: boolean; singleChoice: boolean }): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll: payload, deviceId: getDeviceId() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Fehler beim Erstellen."); return false; }
      if (data?.message) { const msg = data.message as ChatMessage; setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]); }
      return true;
    } catch { setError("Netzwerkfehler."); return false; }
  }

  async function handleCreateAnnouncement(payload: { title: string; description: string; imageUrl: string | null }): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement: payload, deviceId: getDeviceId() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(data?.error ?? "Fehler beim Erstellen."); return false; }
      if (data?.message) { const msg = data.message as ChatMessage; setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]); }
      return true;
    } catch { setError("Netzwerkfehler."); return false; }
  }

  async function handleReact(messageId: number, emoji: string) {
    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      if (data?.message) {
        const m = data.message as ChatMessage;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      }
    } catch {
    }
  }

  let lastDate = "";
  const meColors = ["#5EEAD4", "#2FA599"];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* ─── HEADER ─── */}
        <header className="chat-head">
          <div className="m-head-left">
            <button className="m-back-btn" onClick={() => setShowSidebar(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </button>
              <div className="info">
                <h2>Familien-Chat</h2>
                <div className="status"><span className="dot" />{connected ? `${memberCount} online` : "Verbinden…"}</div>
                {currentUserData.customStatus && <div className="custom-status">{currentUserData.customStatus}</div>}
              </div>
          </div>
          <div className="actions">
            <div className="me-chip" onClick={() => setShowProfile(true)} role="button" tabIndex={0}>
              <div className="me-chip-avatar" style={{ background: currentUserData.profileImage ? undefined : `linear-gradient(135deg,${meColors[0]},${meColors[1]})`, overflow: "hidden" }}>
                {currentUserData.profileImage ? <img src={currentUserData.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(currentUserData.name)}
              </div>
              <div className="me-chip-info">
                <span className="me-chip-name">{currentUserData.name}</span>
                {currentUserData.status && <span className="me-chip-status" style={{ color: statusDotColor(currentUserData.status) }}>{currentUserData.status}</span>}
              </div>
              {currentUserData.status && <span className={`chip-status-dot ${currentUserData.status === "Kein Bock" ? "pulse-red" : currentUserData.status === "Zeit" ? "pulse-green" : ""}`} style={{ background: statusDotColor(currentUserData.status), boxShadow: `0 0 6px ${statusDotColor(currentUserData.status)}` }} />}
              {!currentUserData.status && <span className="chip-status-dot" style={{ background: "#4B5180" }} />}
            </div>
          </div>
        </header>

        {/* ─── MESSAGES ─── */}
        <div className="messages" ref={messagesRef}>
          {messages.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💬</div><p>Noch keine Nachrichten</p><p className="empty-sub">Schreib den ersten Gruß!</p></div>
          ) : messages.map((msg, i) => {
            const own = msg.author === currentUserData.name;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const grouped = prev != null && prev.author === msg.author && isSameDay(prev.createdAt, msg.createdAt);
            const isLastInGroup = !next || next.author !== msg.author || !isSameDay(msg.createdAt, next.createdAt);
            const dateLabel = formatDateLabel(msg.createdAt);
            const showDate = dateLabel && dateLabel !== lastDate ? (lastDate = dateLabel) : null;
            const msgUser = findUserByName(msg.author);
            const [mc1, mc2] = own ? ["#5EEAD4", "#2FA599"] : avatarColors(msg.author);
            const avatarBg = msgUser?.profileImage ? undefined : `linear-gradient(135deg,${mc1},${mc2})`;
            return (
              <div key={msg.id}>
                {showDate && <div className="day-divider">{showDate}</div>}
                <div className={`msg ${own ? "me" : "them"} ${!grouped ? "first" : ""} ${isLastInGroup ? "last" : ""}`} onPointerDown={() => startPress(msg)} onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}>
                  {!own && isLastInGroup && <div className="avatar" style={{ background: avatarBg, overflow: "hidden" }}>{msgUser?.profileImage ? <img src={msgUser.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(msg.author)}</div>}
                  {!own && !isLastInGroup && <div className="avatar-spacer" />}
                  <div className="msg-body">
                    {msg.imageUrl && !msg.title && <img src={msg.imageUrl} alt="Foto" className="bubble-img" />}
                    {msg.videoUrl && <video src={msg.videoUrl} controls playsInline preload="metadata" className="bubble-video" />}
                    {msg.audioUrl && <VoiceBubble url={msg.audioUrl} own={own} author={msg.author} meName={currentUserData.name} timeLabel={formatTime(msg.createdAt)} showName={!own && isLastInGroup} />}
                    {msg.poll && <PollCard poll={msg.poll} meName={currentUserData.name} onVoted={(p) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, poll: p } : m)))} />}
                    {msg.title && <AnnouncementCard msg={msg} authorImage={msgUser?.profileImage ?? null} authorColor={[mc1, mc2]} meName={currentUserData.name} timeLabel={formatTime(msg.createdAt)} />}
                    {msg.content && !msg.poll && !msg.title ? <div className="bubble">{msg.content}<span className="bubble-meta"><span className="bubble-time">{formatTime(msg.createdAt)}</span><svg className="bubble-check" width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.353-.143.47.47 0 0 0-.335.143l-.311.327a.445.445 0 0 0-.14.337c0 .136.046.25.14.343l2.675 2.759a.462.462 0 0 0 .353.156.47.47 0 0 0 .382-.195l6.6-8.125a.445.445 0 0 0-.079-.632l-.349-.228z" fill="rgba(255,255,255,.4)"/><path d="M14.756.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.005-1.047-.311.327 1.525 1.574a.462.462 0 0 0 .353.156.47.47 0 0 0 .382-.195l6.6-8.125a.445.445 0 0 0-.079-.632l-.349-.228-.341-.544z" fill="rgba(255,255,255,.4)"/></svg></span></div> : null}
                  </div>
                  {msg.reactions.length > 0 && (
                    <div className={`msg-reactions ${own ? "right" : "left"}`}>
                      {Object.entries(
                        msg.reactions.reduce<Record<string, number>>((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <span key={emoji} className="msg-reaction" onClick={(e) => { e.stopPropagation(); setReactionInfo({ msgId: msg.id, emoji }); }}>
                          {emoji}
                          {count > 1 && <span className="msg-reaction-count">{count}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="error-bar">{error}</div>}

        {/* ─── COMPOSER ─── */}
        <div className="composer">
          <form onSubmit={(e) => void handleSend(e)}>
            <div className="composer-input-wrap">
              <button type="button" className="emoji-toggle" onClick={() => { setShowAttach(false); setShowEmoji(!showEmoji); }} title="Emojis">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>
              <button type="button" className={`emoji-toggle ${showCamera ? "on" : ""}`} title="Foto oder Video aufnehmen" onClick={() => { setShowCamera(true); setShowEmoji(false); setShowAttach(false); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
              <button type="button" className={`emoji-toggle ${recording ? "on" : ""}`} title={recording ? "Aufnahme beenden" : "Sprachnachricht aufnehmen"} onClick={() => { if (recording) stopRecording(); else startRecording(); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <div style={{ position: "relative" }}>
                <button type="button" className={`emoji-toggle ${showAttach ? "on" : ""}`} onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} title="Mehr">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                </button>
                {showAttach && (
                  <>
                    <div className="m-attach-overlay" onClick={() => setShowAttach(false)} />
                    <div className="m-attach-menu">
                      <button type="button" className="m-attach-item" onClick={() => { setShowPoll(true); setShowAttach(false); }}>
                        <span className="m-attach-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 6h1M12 6h1M19 6h1M5 12h1M5 18h1M9 3v6M9 21v-6M12 12h8M14 9l4 3-4 3"/></svg>
                        </span>
                        <span>Umfrage</span>
                      </button>
                      <button type="button" className="m-attach-item" onClick={() => { setShowAnnouncement(true); setShowAttach(false); }}>
                        <span className="m-attach-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m22 2-7 7M15 4l-2 2-2 2 3 3 2-2 2-2M9 6a3 3 0 1 1-4 4l-1 1 3 3 1-1a3 3 0 0 1 4-4" /></svg>
                        </span>
                        <span>Ankündigungen</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <input ref={inputRef} type="text" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder="Nachricht" autoComplete="off" />
              {showEmoji && <EmojiPicker onSelect={(emoji) => { setDraft((prev) => prev + emoji); setShowEmoji(false); setTimeout(() => inputRef.current?.focus(), 50); }} onClose={() => setShowEmoji(false)} />}
            </div>
            {draft.trim() && !recording ? (
              <button type="submit" className="send-btn" disabled={sending} title="Senden">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>
              </button>
            ) : (
              <button type="button" className={`mic-btn ${dictating ? "on" : ""}`} title={dictating ? "Diktat stoppen" : "Sprechen — wird als Text geschrieben"} onClick={() => { if (dictating) stopDictate(); else startDictate(); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            )}
          </form>
        </div>

        {recording && (
          <>
            <div className="rec-overlay" />
            <div className="rec-pop">
              <div className="rec-timer">{String(Math.floor(recSec / 60)).padStart(2, "0")}:{String(recSec % 60).padStart(2, "0")}</div>
              <div className="rec-mic">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <div className="rec-wave"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
              <div className="rec-text">Aufnahme läuft…</div>
              <div className="rec-hint">Sprich in das Mikrofon</div>
              <div className="rec-actions">
                <button type="button" className="rec-cancel" onClick={cancelRecording}>Abbrechen</button>
                <button type="button" className="rec-stop" onClick={stopRecording}>Fertig</button>
              </div>
            </div>
          </>
        )}

        {audioPreview && (
          <>
            <div className="rec-overlay" onClick={cancelAudioPreview} />
            <div className="rec-pop">
              <div className="rec-timer">Vorschau</div>
              <div className="rec-wave pause"><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
              <VoicePlayer url={audioPreview} />
              <div className="rec-hint">Sprachnachricht senden?</div>
              <div className="rec-actions">
                <button type="button" className="rec-cancel" onClick={cancelAudioPreview}>Verwerfen</button>
                <button type="button" className="rec-send" disabled={audioSending} onClick={() => void sendAudio()}>{audioSending ? "…" : "Senden"}</button>
              </div>
            </div>
          </>
        )}

        {dictating && (
          <>
            <div className="rec-overlay" onClick={stopDictate} />
            <div className="dict-pop">
              <div className="dict-mic-wrap">
                <div className="dict-rings"><span /><span /><span /></div>
                <div className="rec-mic dict">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </div>
              </div>
              <div className="dict-title">Höre zu – sprich einfach los</div>
              <div className="dict-status"><span className="dict-live-dot" />Erkennt deine Stimme…</div>
              {dictateText ? (
                <div className="dict-live"><span className="dict-quote">„</span>{dictateText}<span className="dict-caret" /></div>
              ) : (
                <div className="rec-hint">Dein gesprochener Text erscheint hier live und im Eingabefeld</div>
              )}
              <button type="button" className="rec-stop" onClick={stopDictate}>Fertig</button>
            </div>
          </>
        )}
      </div>

      {/* ─── SIDEBAR OVERLAY ─── */}
      {showSidebar && <div className="m-sidebar-overlay" onClick={() => setShowSidebar(false)} />}
      <div className={`m-sidebar ${showSidebar ? "open" : ""}`}>
        <div className="m-sidebar-head">
          <button className="m-sidebar-back" onClick={() => setShowSidebar(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h3>Mitglieder</h3>
        </div>
        <div className="m-sidebar-list">
          {allUsers.filter((u) => u.status === "Zeit").length > 0 && (<><div className="sb-label"><span className="sb-label-dot" style={{ background: "#5EEAD4" }} />Verfügbar — {allUsers.filter((u) => u.status === "Zeit").length}</div>{allUsers.filter((u) => u.status === "Zeit").map((u) => <UserRow key={u.id} user={u} isMe={u.id === currentUserData.id} onSelect={() => setViewingMember(u)} />)}</>)}
          {allUsers.filter((u) => u.status === "Beschäftigt" || u.status === "Später").length > 0 && (<><div className="sb-label"><span className="sb-label-dot" style={{ background: "#F2C879" }} />Beschäftigt — {allUsers.filter((u) => u.status === "Beschäftigt" || u.status === "Später").length}</div>{allUsers.filter((u) => u.status === "Beschäftigt" || u.status === "Später").map((u) => <UserRow key={u.id} user={u} isMe={u.id === currentUserData.id} onSelect={() => setViewingMember(u)} />)}</>)}
          {allUsers.filter((u) => u.status === "Kein Bock").length > 0 && (<><div className="sb-label"><span className="sb-label-dot" style={{ background: "#F87171" }} />Kein Bock — {allUsers.filter((u) => u.status === "Kein Bock").length}</div>{allUsers.filter((u) => u.status === "Kein Bock").map((u) => <UserRow key={u.id} user={u} isMe={u.id === currentUserData.id} onSelect={() => setViewingMember(u)} />)}</>)}
          {allUsers.filter((u) => !u.status || (!["Zeit","Beschäftigt","Später","Kein Bock"].includes(u.status))).length > 0 && (<><div className="sb-label"><span className="sb-label-dot" style={{ background: "#4B5180" }} />Offline — {allUsers.filter((u) => !u.status || (!["Zeit","Beschäftigt","Später","Kein Bock"].includes(u.status))).length}</div>{allUsers.filter((u) => !u.status || (!["Zeit","Beschäftigt","Später","Kein Bock"].includes(u.status))).map((u) => <UserRow key={u.id} user={u} isMe={u.id === currentUserData.id} onSelect={() => setViewingMember(u)} />)}</>)}
        </div>
        <div className="m-sidebar-footer"><button className="m-logout-btn" onClick={() => void handleLogout()}>Abmelden</button></div>
      </div>

      {/* ─── BOTTOM NAV ─── */}
      <nav className="m-bottomnav">
        <div className="m-nav-item active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          <span>Chat</span>
        </div>
        <div className="m-nav-item" onClick={() => setShowSidebar(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          <span>Leute</span>
        </div>
        <div className="m-nav-item" onClick={() => setShowProfile(true)}>
          <div className="m-nav-avatar" style={{ background: currentUserData.profileImage ? undefined : `linear-gradient(135deg,${meColors[0]},${meColors[1]})`, overflow: "hidden" }}>
            {currentUserData.profileImage ? <img src={currentUserData.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(currentUserData.name)}
          </div>
          <span>Ich</span>
        </div>
      </nav>

      {showProfile && <ProfileModal user={currentUserData} onClose={() => setShowProfile(false)} onUpdated={(u) => { setCurrentUserData(u); loadUsers(); }} />}
      {showPoll && <PollModal meName={currentUserData.name} onClose={() => setShowPoll(false)} onCreate={handleCreatePoll} />}
      {showAnnouncement && <AnnouncementModal onClose={() => setShowAnnouncement(false)} onCreate={handleCreateAnnouncement} />}
      {reactionMsg && <ReactionSheet msg={reactionMsg} onReact={(id, e) => void handleReact(id, e)} onClose={() => setReactionMsg(null)} />}
      {reactionInfo && <ReactionInfoPopup messages={messages} info={reactionInfo} meName={currentUserData.name} onToggle={(id, e) => void handleReact(id, e)} onClose={() => setReactionInfo(null)} />}
      {viewingMember && <MemberProfile user={viewingMember} meName={currentUserData.name} onClose={() => setViewingMember(null)} />}
      {showCamera && <CameraModal onDone={(b, v, cap) => void handleCameraDone(b, v, cap)} onClose={() => setShowCamera(false)} />}
    </>
  );
}

function ReactionInfoPopup({ messages, info, meName, onToggle, onClose }: {
  messages: ChatMessage[];
  info: { msgId: number; emoji: string };
  meName: string;
  onToggle: (messageId: number, emoji: string) => void;
  onClose: () => void;
}) {
  const msg = messages.find((m) => m.id === info.msgId);
  const voters = (msg ? msg.reactions.filter((r) => r.emoji === info.emoji) : []).map((r) => r.voter);
  return (
    <>
      <style>{reactionInfoCss}</style>
      <div className="ri-overlay" onClick={onClose} />
      <div className="ri-pop">
        <div className="ri-head">
          <span className="ri-emoji">{info.emoji}</span>
          <span className="ri-title">Reaktionen</span>
        </div>
        <div className="ri-list">
          {voters.length === 0 && <div className="ri-empty">Keine Reaktionen</div>}
          {voters.map((v) => (
            <div key={v} className="ri-row">
              <span className={`ri-name${v === meName ? " ri-me" : ""}`}>{v}{v === meName ? " (du)" : ""}</span>
              <button className="ri-toggle" onClick={() => { onToggle(info.msgId, info.emoji); onClose(); }}>{info.emoji}</button>
            </div>
          ))}
        </div>
        <button className="ri-close" onClick={onClose}>Schließen</button>
      </div>
    </>
  );
}

function UserRow({ user, isMe, onSelect }: { user: User; isMe: boolean; onSelect: () => void }) {
  const colors = avatarColors(user.name);
  const dotColor = statusDotColor(user.status);
  const pulseClass = user.status === "Kein Bock" ? "sb-pulse-red" : user.status === "Zeit" ? "sb-pulse-green" : "";
  return (
    <button type="button" className={`sb-user ${isMe ? "sb-me" : ""}`} onClick={onSelect} style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", fontFamily: "inherit" }}>
      <div className="sb-avatar-wrap">
        <div className="sb-avatar" style={{ background: user.profileImage ? undefined : `linear-gradient(135deg,${colors[0]},${colors[1]})` }}>
          {user.profileImage ? <img src={user.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : initials(user.name)}
        </div>
        <span className={`sb-status-dot ${pulseClass}`} style={{ background: dotColor, boxShadow: user.status ? `0 0 6px ${dotColor}` : undefined }} />
      </div>
      <div className="sb-user-info">
        <span className="sb-uname">{user.name}{isMe ? " (du)" : ""}</span>
        {user.customStatus && <span className="sb-ucustom" style={{ color: "var(--accent)" }}>{user.customStatus}</span>}
        {(user.status || user.vacation) && <span className="sb-umeta">{user.status && <span style={{ color: dotColor }}>{user.status}</span>}{user.status && user.vacation && <span> · </span>}{user.vacation && <span>{user.vacation}</span>}</span>}
      </div>
    </button>
  );
}

function fmtDur(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function VoicePlayer({ url, own, duration }: { url: string; own?: boolean; duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [len, setLen] = useState(duration ?? 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); stop(); return; }
    if (a.readyState >= 1 && a.currentTime >= a.duration - 0.05) a.currentTime = 0;
    a.play().catch(() => {});
    setPlaying(true);
    const loop = () => {
      if (!audioRef.current) return;
      setT(audioRef.current.currentTime);
      if (audioRef.current.duration && !Number.isNaN(audioRef.current.duration)) setLen(audioRef.current.duration);
      if (!audioRef.current.paused) rafRef.current = requestAnimationFrame(loop);
      else stop();
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  const pct = len > 0 ? Math.min(100, (t / len) * 100) : 0;

  return (
    <div className={`vp ${own ? "vp-own" : "vp-them"}`}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (d && !Number.isNaN(d)) setLen(d); }}
        onEnded={stop}
      />
      <button type="button" className="vp-play" onClick={toggle}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">{playing ? <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></> : <path d="M8 5v14l11-7z"/>}</svg>
      </button>
      <div className="vp-body">
        <div className="vp-wave">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="vp-bar" style={{ height: `${30 + ((i * 37) % 70)}%`, opacity: pct >= ((i + 1) / 28) * 100 ? 1 : 0.45 }} />
          ))}
        </div>
        <div className="vp-time">{fmtDur(playing ? t : (duration ?? len ?? 0))}</div>
      </div>
    </div>
  );
}

function VoiceBubble({ url, own, author, meName, timeLabel, showName }: {
  url: string; own: boolean; author: string; meName: string; timeLabel: string; showName: boolean;
}) {
  return (
    <div className={`vb ${own ? "vb-own" : "vb-them"}`}>
      {showName && !own && (
        <span className="vb-name">
          {author}{author === meName ? " (du)" : ""}
        </span>
      )}
      <div className="vb-card">
        <VoicePlayer url={url} own={own} />
        <span className="vb-meta">
          <span className="vb-time">{timeLabel}</span>
          <svg className="bubble-check" width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.353-.143.47.47 0 0 0-.335.143l-.311.327a.445.445 0 0 0-.14.337c0 .136.046.25.14.343l2.675 2.759a.462.462 0 0 0 .353.156.47.47 0 0 0 .382-.195l6.6-8.125a.445.445 0 0 0-.079-.632l-.349-.228z" fill="rgba(255,255,255,.4)"/><path d="M14.756.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.005-1.047-.311.327 1.525 1.574a.462.462 0 0 0 .353.156.47.47 0 0 0 .382-.195l6.6-8.125a.445.445 0 0 0-.079-.632l-.349-.228-.341-.544z" fill="rgba(255,255,255,.4)"/></svg>
        </span>
      </div>
    </div>
  );
}

function MemberProfile({ user, meName, onClose }: { user: User; meName: string; onClose: () => void }) {
  const colors = avatarColors(user.name);
  const dotColor = statusDotColor(user.status);
  const memberCss = `
.mp-overlay{position:fixed;inset:0;z-index:135;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);animation:pmFadeIn .2s;padding-bottom:10vh}
.mp-card{width:100%;max-width:400px;max-height:88dvh;overflow-y:auto;border-radius:24px;background:#151A30;border:1px solid rgba(94,234,212,.08);box-shadow:0 24px 64px rgba(0,0,0,.6);animation:pmSlideUp .35s cubic-bezier(.16,1,.3,1)}
.mp-card::-webkit-scrollbar{width:0}
.mp-header{display:flex;align-items:center;justify-content:flex-end;padding:18px 20px 0}
.mp-close{width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.06);color:#8A90B8;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:.15s}
.mp-close:hover{background:rgba(255,255,255,.1);color:#EDEFFA}
.mp-body{padding:0 24px 22px;display:flex;flex-direction:column;align-items:center;gap:14px}
.mp-avatar-ring{width:110px;height:110px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#5EEAD4,#2FA599)}
.mp-avatar{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden}
.mp-avatar-img{width:100%;height:100%;object-fit:cover}
.mp-avatar-text{font-family:'Space Grotesk',system-ui;font-size:34px;font-weight:700;color:#fff}
.mp-name{font-family:'Space Grotesk',system-ui;font-size:21px;font-weight:700;color:#EDEFFA;text-align:center}
.mp-me{font-size:12px;color:#8A90B8;text-align:center}
.mp-custom{font-size:15px;color:var(--accent);font-weight:500;text-align:center}
.mp-info{width:100%;display:flex;flex-direction:column;gap:8px;margin-top:6px}
.mp-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04)}
.mp-row-icon{font-size:18px}
.mp-row-label{font-size:12px;color:#8A90B8;text-transform:uppercase;letter-spacing:.5px}
.mp-row-value{font-size:14px;color:#EDEFFA;font-weight:500;display:flex;align-items:center;gap:6px}
.mp-chip{padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
`;
  const statusColors: Record<string, string> = { "Zeit": "#5EEAD4", "Beschäftigt": "#F2C879", "Später": "#F2C879", "Kein Bock": "#F87171" };
  return (
    <>
      <style>{memberCss}</style>
      <div className="mp-overlay" onClick={onClose}>
        <div className="mp-card" onClick={(e) => e.stopPropagation()}>
          <div className="mp-header">
            <button className="mp-close" onClick={onClose}>✕</button>
          </div>
          <div className="mp-body">
            <div className="mp-avatar-ring">
              <div className="mp-avatar" style={{ background: user.profileImage ? undefined : `linear-gradient(135deg,${colors[0]},${colors[1]})` }}>
                {user.profileImage ? <img src={user.profileImage} alt="" className="mp-avatar-img" /> : <span className="mp-avatar-text">{initials(user.name)}</span>}
              </div>
            </div>
            <div>
              <div className="mp-name">{user.name}</div>
              {meName === user.name && <div className="mp-me">Das bist du</div>}
            </div>
            {user.customStatus && <div className="mp-custom">"{user.customStatus}"</div>}
            <div className="mp-info">
              <div className="mp-row">
                <div className="mp-row-icon">🎭</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div className="mp-row-label">Stimmung</div>
                  <div className="mp-row-value">{user.status ? <><span className="mp-chip" style={{ background: `${statusColors[user.status] || "#4B5180"}22`, color: statusColors[user.status] || "#9AA0C7", border: `1px solid ${statusColors[user.status] || "#4B5180"}55` }}>{user.status}</span><span className="sb-status-dot" style={{ background: dotColor }} /></> : "—"}</div>
                </div>
              </div>
              {user.vacation && (
                <div className="mp-row">
                  <div className="mp-row-icon">📍</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div className="mp-row-label">Erreichbarkeit</div>
                    <div className="mp-row-value">{user.vacation}</div>
                  </div>
                </div>
              )}
              {user.birthday && (
                <div className="mp-row">
                  <div className="mp-row-icon">🎂</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div className="mp-row-label">Geburtstag</div>
                    <div className="mp-row-value">{user.birthday}</div>
                  </div>
                </div>
              )}
              <div className="mp-row">
                <div className="mp-row-icon">👤</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div className="mp-row-label">Mitglied seit</div>
                  <div className="mp-row-value">{new Date(user.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const reactionInfoCss = `
.ri-overlay{position:fixed;inset:0;z-index:130;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);animation:riFade .15s}
.ri-pop{position:fixed;z-index:131;left:50%;top:50%;transform:translate(-50%,-50%);width:min(300px,86vw);background:var(--bg-panel);border:1px solid var(--line);border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.6);overflow:hidden;animation:riPop .22s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column}
@keyframes riPop{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes riFade{from{opacity:0}to{opacity:1}}
.ri-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.ri-emoji{font-size:26px}
.ri-title{font-family:'Space Grotesk',system-ui;font-size:15px;font-weight:700;color:var(--text-main)}
.ri-list{flex:1;max-height:280px;overflow-y:auto;padding:6px 8px}
.ri-row{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px}
.ri-row:hover{background:var(--bg-panel-2)}
.ri-name{font-size:14px;color:var(--text-main)}
.ri-me{color:var(--accent);font-weight:600}
.ri-toggle{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--bg-panel-2);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.12s}
.ri-toggle:active{transform:scale(.9)}
.ri-toggle:hover{border-color:var(--accent-dim)}
.ri-empty{padding:18px;text-align:center;color:var(--text-dim);font-size:13px}
.ri-close{border:none;border-top:1px solid var(--line);background:transparent;color:var(--accent);padding:13px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.ri-close:hover{background:var(--bg-panel-2)}
`;

const css = `
:root{--bg-deep:#12162B;--bg-panel:#171C36;--bg-panel-2:#1D2342;--line:#2A3158;--text-main:#EDEFFA;--text-dim:#8A90B8;--accent:#5EEAD4;--accent-dim:#2FA599;--gold:#F2C879;--bubble-me:#005C4B;--bubble-them:#232A4E;--online:#5EEAD4;--radius:16px}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg-deep);color:var(--text-main);font-family:'Inter',system-ui,sans-serif;overflow:hidden}
body{background-image:radial-gradient(circle at 15% 10%,rgba(94,234,212,.06),transparent 40%),radial-gradient(circle at 85% 90%,rgba(242,200,121,.05),transparent 45%)}
h1,h2,h3,.brand,.msg-name{font-family:'Space Grotesk',system-ui,sans-serif}

/* ===== IMMER MOBILE ===== */
.app{display:flex;flex-direction:column;height:calc(100dvh - 60px)}

.chat-head{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--line);background:rgba(23,28,54,.6);backdrop-filter:blur(6px);flex-shrink:0}
.m-head-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.m-back-btn{display:flex;width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--bg-panel);color:var(--text-dim);align-items:center;justify-content:center;cursor:pointer;transition:.15s;flex-shrink:0}
.m-back-btn:hover{color:var(--accent);border-color:var(--accent-dim)}
.chat-head .info h2{font-size:15px;font-weight:600}
.chat-head .info .status{font-size:11px;color:var(--text-dim);display:flex;align-items:center;gap:6px;margin-top:2px}
.custom-status{font-size:12px;color:var(--accent);margin-top:3px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dot{width:8px;height:8px;border-radius:50%;background:var(--online);box-shadow:0 0 8px var(--online)}
.chat-head .actions{display:flex;gap:8px;align-items:center;flex-shrink:0}
.me-chip{display:flex;align-items:center;gap:6px;border-radius:20px;border:1px solid var(--line);background:var(--bg-panel);padding:4px 10px 4px 4px;cursor:pointer;transition:.15s}
.me-chip:hover{border-color:var(--accent-dim);background:var(--bg-panel-2)}
.me-chip-avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#0D1026;flex-shrink:0}
.me-chip-info{display:flex;flex-direction:column;min-width:0}
.me-chip-name{font-size:11px;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.me-chip-status{font-size:9px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip-status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.pulse-red{animation:pulseRed 1.5s ease-in-out infinite}
.pulse-green{animation:pulseGreen 2s ease-in-out infinite}
@keyframes pulseRed{0%,100%{box-shadow:0 0 4px #F87171,0 0 8px #F87171}50%{box-shadow:0 0 10px #F87171,0 0 24px #F87171,0 0 36px rgba(248,113,113,.3)}}
@keyframes pulseGreen{0%,100%{box-shadow:0 0 4px #5EEAD4,0 0 8px #5EEAD4}50%{box-shadow:0 0 10px #5EEAD4,0 0 24px #5EEAD4,0 0 36px rgba(94,234,212,.3)}}

.messages{flex:1;overflow-y:auto;padding:12px 0 20px;display:flex;flex-direction:column;gap:4px}
.messages::-webkit-scrollbar{width:4px}
.messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px}
.day-divider{align-self:center;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.5);background:rgba(0,0,0,.35);padding:5px 14px;border-radius:8px;margin:16px auto 10px;backdrop-filter:blur(4px);box-shadow:0 1px 3px rgba(0,0,0,.2)}
.msg{display:flex;gap:5px;max-width:88%;padding-left:6px;padding-right:6px;animation:msg-in .15s ease-out;position:relative}
.msg.them{align-self:flex-start}
.msg.me{align-self:flex-end;flex-direction:row-reverse}
.msg.first{margin-top:6px}
.avatar{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#0D1026}
.avatar-spacer{width:26px;flex-shrink:0}
.msg-body{display:flex;flex-direction:column;gap:0;min-width:0}
.bubble{padding:8px 12px 6px;border-radius:12px;line-height:1.35;font-size:14px;background:var(--bubble-them);position:relative;word-wrap:break-word;overflow-wrap:break-word;display:flex;flex-wrap:wrap;align-items:flex-end;gap:0 4px}
.msg.me .bubble{background:linear-gradient(135deg,var(--bubble-me),#004D40);border-bottom-right-radius:4px}
.msg.them .bubble{border-bottom-left-radius:4px}
.msg.last.them .bubble{border-top-left-radius:12px}
.msg.last.me .bubble{border-top-right-radius:12px}
.bubble-meta{display:flex;align-items:center;gap:3px;margin-left:auto;flex-shrink:0;padding-top:3px}
.bubble-time{font-size:10px;color:rgba(255,255,255,.35)}
.bubble-check{opacity:.5}
.bubble-img{max-width:260px;border-radius:8px;object-fit:cover;margin:2px 0}
.bubble-video{max-width:300px;max-height:360px;border-radius:8px;margin:2px 0;background:#000}
.msg-reactions{position:absolute;bottom:-10px;display:flex;gap:4px;flex-wrap:wrap;z-index:2}
.msg-reactions.left{left:10px}
.msg-reactions.right{right:10px}
.msg-reaction{display:inline-flex;align-items:center;gap:3px;font-size:15px;background:var(--bg-panel);border:1px solid var(--line);border-radius:14px;padding:1px 6px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.35);line-height:1.4}
.msg-reaction:active{transform:scale(.9)}
.msg-reaction-count{font-size:11px;color:var(--text-main);font-weight:600}

/* ===== COMPOSER ===== */
.composer{background:var(--bg-panel);border-top:1px solid var(--line);padding:10px 12px 12px;flex-shrink:0;width:100%;box-sizing:border-box;position:relative;z-index:34}
.composer form{display:flex;align-items:flex-end;gap:6px;width:100%;min-width:0}
.composer form > *{max-width:100%}
.composer-input-wrap{flex:1;min-width:0;position:relative;display:flex;align-items:center;background:var(--bg-panel-2);border-radius:24px;min-height:44px;padding:0 8px 0 12px;box-sizing:border-box}
.composer-input-wrap input{flex:1;background:transparent;border:none;color:var(--text-main);font-size:15px;padding:11px 6px;outline:none;font-family:inherit}
.composer-input-wrap input::placeholder{color:var(--text-dim)}
.emoji-toggle{width:34px;height:34px;border-radius:50%;border:none;background:transparent;color:var(--text-dim);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:color .15s;font-size:18px}
.emoji-toggle:hover{color:var(--text-main)}
.emoji-toggle.on{color:var(--accent);background:rgba(94,234,212,.1)}
.m-attach-overlay{position:fixed;inset:0;z-index:30}
.m-attach-menu{position:absolute;bottom:calc(100% + 8px);left:-10px;z-index:31;min-width:150px;background:var(--bg-panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);padding:6px;animation:mAttachIn .18s ease-out;display:flex;flex-direction:column}
@keyframes mAttachIn{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.m-attach-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;background:none;border:none;color:var(--text-main);font-size:14px;font-family:inherit;cursor:pointer;text-align:left}
.m-attach-item:hover{background:var(--bg-panel-2)}
.m-attach-icon{width:30px;height:30px;border-radius:9px;background:var(--accent);color:#0B1B20;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.send-btn{width:40px;height:40px;border-radius:50%;border:none;background:var(--accent);color:#0B1B20;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:transform .1s}
.send-btn:active{transform:scale(.92)}
.send-btn:disabled{opacity:.3;cursor:default;transform:none}
.mic-btn{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:var(--text-dim);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-right:2px}
.mic-btn:hover{color:var(--text-main)}
.mic-btn.on{color:var(--accent);background:rgba(94,234,212,.12);animation:micPulse 1.1s ease-in-out infinite}
@keyframes micPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
.rec-overlay{position:fixed;inset:0;z-index:140;background:rgba(10,12,24,.7);backdrop-filter:blur(4px)}
.rec-pop{position:fixed;z-index:141;left:50%;top:44%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;width:min(340px,86vw)}
.rec-timer{font-family:'Space Grotesk',system-ui;font-size:15px;font-weight:700;color:var(--accent);letter-spacing:.04em}
.rec-mic{width:92px;height:92px;border-radius:50%;background:var(--accent);color:#0B1B20;display:flex;align-items:center;justify-content:center;animation:recMic 1.2s ease-in-out infinite;box-shadow:0 0 0 0 rgba(94,234,212,.6)}
@keyframes recMic{0%{box-shadow:0 0 0 0 rgba(94,234,212,.6)}70%{box-shadow:0 0 0 26px rgba(94,234,212,0)}100%{box-shadow:0 0 0 0 rgba(94,234,212,0)}}
.rec-wave{display:flex;align-items:center;gap:3px;height:40px;width:100%;justify-content:center}
.rec-wave span{width:3px;height:30%;background:var(--accent);border-radius:2px;opacity:.8}
.rec-wave span:nth-child(odd){animation:waveB 1s ease-in-out infinite}
.rec-wave span:nth-child(even){animation:waveB 1.2s ease-in-out infinite}
.rec-wave.pause span{animation:none}
@keyframes waveB{0%,100%{height:20%}50%{height:95%}}
.rec-text{font-family:'Space Grotesk',system-ui;font-size:18px;font-weight:700;color:var(--text-main)}
.rec-live{font-size:14px;color:var(--text-main);background:var(--bg-panel);border:1px solid var(--line);border-radius:12px;padding:10px 14px;max-width:100%;word-wrap:break-word;min-height:22px}
.rec-mic.dict{animation:none;background:var(--bg-panel-2);border:2px solid var(--accent)}
.rec-hint{font-size:12px;color:var(--text-dim)}

/* ===== DICTATION POPUP ===== */
.dict-pop{position:fixed;z-index:141;left:50%;top:44%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;width:min(360px,88vw);background:var(--bg-panel);border:1px solid var(--line);border-radius:24px;padding:28px 22px 22px;box-shadow:0 24px 64px rgba(0,0,0,.6);animation:dictIn .25s cubic-bezier(.16,1,.3,1)}
@keyframes dictIn{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.dict-mic-wrap{position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center}
.dict-mic-wrap .rec-mic{width:84px;height:84px;position:relative;z-index:2}
.dict-rings{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.dict-rings span{position:absolute;width:70px;height:70px;border-radius:50%;border:2px solid rgba(94,234,212,.5);animation:dictRing 2s ease-out infinite}
.dict-rings span:nth-child(2){animation-delay:1s}
.dict-rings span:nth-child(3){animation-delay:1.5s}
@keyframes dictRing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}
.dict-title{font-family:'Space Grotesk',system-ui;font-size:17px;font-weight:700;color:var(--text-main)}
.dict-status{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--text-dim);font-weight:500}
.dict-live-dot{width:8px;height:8px;border-radius:50%;background:#f87171;animation:dictBlink 1s ease-in-out infinite}
@keyframes dictBlink{0%,100%{opacity:1}50%{opacity:.2}}
.dict-live{width:100%;font-size:16px;line-height:1.5;color:var(--text-main);background:var(--bg-panel-2);border:1px solid var(--line);border-radius:14px;padding:14px 16px;text-align:left;word-wrap:break-word;min-height:56px;max-height:180px;overflow-y:auto}
.dict-quote{color:var(--accent);font-size:20px;font-weight:700}
.dict-caret{display:inline-block;width:2px;height:19px;background:var(--accent);margin-left:3px;vertical-align:-3px;animation:dictBlink .8s ease-in-out infinite}
.dict-pop .rec-stop{width:100%;padding:13px;border-radius:14px}


.rec-actions{display:flex;gap:10px;margin-top:4px;width:100%;justify-content:center}
.rec-cancel{border:1px solid var(--line);background:var(--bg-panel-2);color:var(--text-dim);font-size:14px;font-weight:600;padding:11px 20px;border-radius:14px;cursor:pointer;font-family:inherit;transition:.12s}
.rec-cancel:active{transform:scale(.96)}
.rec-stop{border:none;background:var(--accent);color:#0B1B20;font-size:14px;font-weight:700;padding:11px 24px;border-radius:14px;cursor:pointer;font-family:inherit;transition:transform .1s}
.rec-stop:active{transform:scale(.95)}
.rec-send{border:none;background:var(--accent);color:#0B1B20;font-size:14px;font-weight:700;padding:11px 24px;border-radius:14px;cursor:pointer;font-family:inherit;transition:transform .1s}
.rec-send:disabled{opacity:.4;cursor:default}
.rec-send:active{transform:scale(.95)}

/* ===== VOICE PLAYER / BUBBLE ===== */
.vb{max-width:280px;display:flex;flex-direction:column}
.vb-own{align-items:flex-end}
.vb-them{align-items:flex-start}
.vb-name{font-size:12px;font-weight:600;color:var(--accent);margin:0 4px 2px}
.vb-name:empty{display:none}
.vb-card{display:flex;flex-direction:column;align-items:stretch;background:var(--bubble-them);border-radius:12px;border-bottom-left-radius:4px;overflow:hidden}
.vb-own .vb-card{background:linear-gradient(135deg,var(--bubble-me),#004D40);border-bottom-left-radius:12px;border-bottom-right-radius:4px}
.vb-them .vb-card{border-bottom-right-radius:12px}
.vb .vp{border-radius:12px 12px 4px 4px}
.vp{display:flex;align-items:center;gap:10px;padding:8px 10px 6px;min-width:210px}
.vp-them,.vp-own{background:transparent}
.vp-play{width:38px;height:38px;border-radius:50%;border:none;background:rgba(255,255,255,.18);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:transform .1s}
.vp-play:active{transform:scale(.9)}
.vp-body{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0}
.vp-wave{display:flex;align-items:center;gap:2px;height:26px;justify-content:space-between}
.vp-bar{width:3px;background:#fff;border-radius:2px;min-height:2px}
.vp-time{font-size:11px;font-weight:600;color:rgba(255,255,255,.85);text-align:right}
.vb-meta{display:flex;align-items:center;justify-content:flex-end;gap:4px;padding:2px 8px 7px}
.vb-time{font-size:11px;color:rgba(255,255,255,.55)}
.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--text-dim)}
.empty-icon{font-size:52px;opacity:.4}
.empty-sub{font-size:14px;opacity:.5}
.error-bar{border-top:1px solid rgba(239,68,68,.15);background:rgba(239,68,68,.06);padding:8px 16px;text-align:center;font-size:13px;color:#f87171}

/* ===== SIDEBAR ===== */
.m-sidebar-overlay{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.5);backdrop-filter:blur(2px)}
.m-sidebar{position:fixed;top:0;right:0;bottom:0;width:320px;max-width:85vw;background:var(--bg-panel);border-left:1px solid var(--line);flex-direction:column;z-index:81;transform:translateX(100%);transition:transform .25s cubic-bezier(.16,1,.3,1);display:flex}
.m-sidebar.open{transform:translateX(0)}
.m-sidebar-head{display:flex;align-items:center;gap:10px;padding:18px 20px 16px;border-bottom:1px solid var(--line)}
.m-sidebar-head h3{font-family:'Space Grotesk',system-ui;font-size:16px;font-weight:700;color:var(--text-main);flex:1}
.m-sidebar-back{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--bg-panel-2);color:var(--text-dim);display:flex;align-items:center;justify-content:center;cursor:pointer}
.m-sidebar-back:hover{color:var(--text-main)}
.m-sidebar-list{flex:1;overflow-y:auto;padding:6px 16px}
.sb-label{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-dim);padding:16px 10px 8px;font-family:'Space Grotesk',system-ui}
.sb-label-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sb-user{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;cursor:default;transition:background .12s}
.sb-user:hover{background:var(--bg-panel-2)}
.sb-me{background:rgba(94,234,212,.05)}
.sb-avatar-wrap{position:relative;flex-shrink:0}
.sb-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#0D1026;overflow:hidden}
.sb-status-dot{position:absolute;bottom:-1px;right:-1px;width:11px;height:11px;border-radius:50%;border:2px solid var(--bg-panel)}
.sb-pulse-red{animation:pulseRed 1.5s ease-in-out infinite}
.sb-pulse-green{animation:pulseGreen 2s ease-in-out infinite}
.sb-user-info{display:flex;flex-direction:column;min-width:0;gap:2px}
.sb-uname{font-size:14px;font-weight:600;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-umeta{font-size:12px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-ucustom{font-size:12px;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-sidebar-footer{padding:16px 20px;border-top:1px solid var(--line)}
.m-logout-btn{width:100%;padding:12px;border-radius:14px;border:1px solid rgba(239,68,68,.2);background:rgba(239,68,68,.06);color:#f87171;font-size:14px;font-weight:600;cursor:pointer;transition:.15s;font-family:inherit}
.m-logout-btn:hover{background:rgba(239,68,68,.12)}

/* ===== BOTTOM NAV ===== */
.m-bottomnav{display:flex;height:64px;background:var(--bg-panel);border-top:1px solid var(--line);align-items:center;justify-content:space-around;padding-bottom:env(safe-area-inset-bottom);flex-shrink:0}
.m-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--text-dim);cursor:pointer;padding:8px 24px;border-radius:14px;transition:.15s}
.m-nav-item.active{color:var(--accent)}
.m-nav-item span{font-size:11px;font-weight:600}
.m-nav-avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#0D1026;border:2px solid var(--accent)}

@keyframes msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
*:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
`;
