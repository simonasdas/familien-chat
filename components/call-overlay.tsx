"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@/lib/types";

type Phase = "idle" | "outgoing" | "incoming" | "active";

const STUN = { urls: "stun:stun.l.google.com:19302" };

const css = `
.co-overlay{position:fixed;inset:0;z-index:200;background:#0A0E17;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.co-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.co-self-wrap{position:absolute;top:16px;right:16px;width:110px;height:150px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.2);background:#111827;z-index:3}
.co-self-video{width:100%;height:100%;object-fit:cover}
.co-self-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;color:#8A90B8}
.co-head{position:relative;z-index:3;text-align:center;padding:0 20px}
.co-name{font-family:'Space Grotesk',system-ui;font-size:26px;font-weight:700;color:#fff}
.co-sub{font-size:15px;color:#9AA0C7;margin-top:6px}
.co-avatar{width:96px;height:96px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',system-ui;font-size:34px;font-weight:700;color:#fff;border:3px solid rgba(255,255,255,.15)}
.co-controls{position:absolute;bottom:40px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:18px;z-index:3;padding:0 20px}
.co-btn{width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s;background:rgba(255,255,255,.1);color:#fff;position:relative}
.co-btn:hover{background:rgba(255,255,255,.18)}
.co-btn.end{background:#F0394B;width:70px;height:70px;box-shadow:0 8px 30px rgba(240,57,75,.4)}
.co-btn.accept{background:#2BD486;box-shadow:0 8px 30px rgba(43,212,134,.4)}
.co-btn.off{background:rgba(255,255,255,.06);color:#F0394B}
.co-btn .co-label{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:11px;color:#9AA0C7;white-space:nowrap}
.co-ring{width:150px;height:150px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;background:linear-gradient(135deg,#5EEAD4,#2FA599);animation:coPulse 1.3s ease-in-out infinite;box-shadow:0 0 0 0 rgba(94,234,212,.5)}
.co-ring svg{color:#0B1B20}
@keyframes coPulse{0%{box-shadow:0 0 0 0 rgba(94,234,212,.45);transform:scale(1)}50%{box-shadow:0 0 0 26px rgba(94,234,212,0);transform:scale(1.05)}100%{box-shadow:0 0 0 0 rgba(94,234,212,0);transform:scale(1)}}
.co-toprow{position:absolute;top:18px;left:0;right:0;display:flex;justify-content:center;z-index:3}
.co-badge{background:rgba(255,255,255,.12);color:#EDEFFA;font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px;backdrop-filter:blur(6px)}
.co-note{font-size:13px;color:#9AA0C7;margin-top:14px}
.co-endbtn{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:70px;height:70px;border-radius:50%;border:none;background:#F0394B;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;box-shadow:0 8px 30px rgba(240,57,75,.4)}
`;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

async function postSignal(to: string, type: string, payload?: unknown) {
  try {
    await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, type, payload }),
    });
  } catch {}
}

export function CallOverlay({
  me,
  target,
  onDismiss,
}: {
  me: string;
  target: User | null;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [peer, setPeer] = useState<User | null>(target);
  const [incomingName, setIncomingName] = useState<string | null>(null);
  const [selfVideo, setSelfVideo] = useState(false);
  const [peerVideo, setPeerVideo] = useState(false);
  const [micOff, setMicOff] = useState(false);
  const [selfVideoOn, setSelfVideoOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef(0);
  const wasVideoRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const peerNameRef = useRef<string | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingOfferRef = useRef<{ from: string; sdp: any } | null>(null);
  const mountedRef = useRef(true);

  phaseRef.current = phase;
  const activePeerName = peer?.name ?? incomingName;
  if (activePeerName) peerNameRef.current = activePeerName;

  function cleanup() {
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    localStreamRef.current = null;
    try { peerStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    peerStreamRef.current = null;
    if (selfVideoRef.current) selfVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (clockRef.current) { clearInterval(clockRef.current); clockRef.current = null; }
    pendingOfferRef.current = null;
    setElapsed(0);
  }

  function endCall() {
    cleanup();
    setPhase("idle");
    setIncomingName(null);
    setPeer(null);
    setSelfVideo(false);
    setPeerVideo(false);
    onDismiss();
  }

  function makePc() {
    const pc = new RTCPeerConnection({ iceServers: [STUN] });
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      const name = peerNameRef.current;
      if (e.candidate && name) postSignal(name, "candidate", e.candidate.toJSON());
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      peerStreamRef.current = stream;
      setPeerVideo(true);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };
    return pc;
  }

  function startClock() {
    if (clockRef.current) return;
    startTimeRef.current = Date.now();
    clockRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 500);
  }

  async function obtainStream() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      wasVideoRef.current = true;
      setSelfVideoOn(true);
      return s;
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        wasVideoRef.current = false;
        setSelfVideoOn(false);
        setSelfVideo(false);
        return s;
      } catch {
        return null;
      }
    }
  }

  async function startCall(targetUser: User) {
    setPeer(targetUser);
    const name = targetUser.name;
    const stream = await obtainStream();
    if (!stream || !mountedRef.current) {
      if (name) postSignal(name, "decline", { reason: "nomic" });
      endCall();
      return;
    }
    localStreamRef.current = stream;
    setSelfVideo(true);
    if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
    stream.getTracks().forEach((t) => { if (t.kind === "video") t.enabled = wasVideoRef.current; });

    const pc = makePc();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (!mountedRef.current) return;
    setPhase("outgoing");
    postSignal(name, "ring", { video: wasVideoRef.current });
    postSignal(name, "offer", { sdp: pc.localDescription });
  }

  function handleIncomingRing(from: string) {
    if (phaseRef.current !== "idle") {
      postSignal(from, "busy", {});
      return;
    }
    setIncomingName(from);
    setSelfVideo(false);
    setSelfVideoOn(false);
    setMicOff(false);
    setPhase("incoming");
  }

  async function answer() {
    const name = incomingName;
    const offer = pendingOfferRef.current;
    if (!name || !offer) return;
    const stream = await obtainStream();
    if (!stream || !mountedRef.current) {
      postSignal(name, "decline", { reason: "nomic" });
      setPhase("idle");
      setIncomingName(null);
      return;
    }
    localStreamRef.current = stream;
    setSelfVideo(true);
    pendingOfferRef.current = null;
    if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
    const pc = makePc();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    try {
      await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      postSignal(name, "answer", { sdp: pc.localDescription });
      if (mountedRef.current) {
        setPhase("active");
        startClock();
      }
    } catch {
      postSignal(name, "decline", { reason: "sdp" });
      endCall();
    }
  }

  async function toggleVideo() {
    const next = !selfVideoOn;
    setSelfVideoOn(next);
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) {
        if (t.kind === "video") t.enabled = next;
      }
    }
    if (next && !localStreamRef.current?.getVideoTracks().length) {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({ video: true });
        vs.getVideoTracks().forEach((t) => {
          localStreamRef.current?.addTrack(t);
          pcRef.current?.addTrack(t, localStreamRef.current!);
        });
      } catch { setSelfVideoOn(false); return; }
    }
    setSelfVideo(!!localStreamRef.current?.getVideoTracks().length);
    const name = peerNameRef.current;
    if (name) postSignal(name, "video", { on: next });
  }

  function toggleMic() {
    const next = !micOff;
    setMicOff(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
  }

  function hangup() {
    const name = peerNameRef.current;
    if (name) postSignal(name, "hangup", {});
    endCall();
  }

  useEffect(() => {
    mountedRef.current = true;
    const es = new EventSource("/api/call/events");
    es.onmessage = async (e) => {
      let data: { from: string; type: string; payload?: any };
      try { data = JSON.parse(e.data); } catch { return; }
      if (data.from === me) return;

      switch (data.type) {
        case "ring":
          handleIncomingRing(data.from);
          break;
        case "offer":
          pendingOfferRef.current = { from: data.from, sdp: data.payload?.sdp };
          break;
        case "answer": {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription === null && data.payload?.sdp) {
            try { await pc.setRemoteDescription({ type: "answer", sdp: data.payload.sdp }); } catch {}
          }
          if (mountedRef.current) {
            setPhase("active");
            startClock();
          }
          break;
        }
        case "candidate": {
          const pc = pcRef.current;
          if (pc && data.payload) {
            try { await pc.addIceCandidate(data.payload); } catch {}
          }
          break;
        }
        case "video":
          setPeerVideo(!!data.payload?.on);
          break;
        case "decline":
          endCall();
          break;
        case "busy":
          endCall();
          break;
        case "hangup":
          endCall();
          break;
      }
    };
    return () => { mountedRef.current = false; es.close(); cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    if (!target) return;
    void startCall(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  function fmt(sec: number) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  const peerUser = peer;
  const displayName = (phase === "incoming" && incomingName ? incomingName : (peerUser?.name ?? "")) || "";

  if (phase === "idle") return null;

  if (phase === "incoming") {
    return (
      <>
        <style>{css}</style>
        <div className="co-overlay">
          <div className="co-avatar" style={{ background: "linear-gradient(135deg,#5EEAD4,#2FA599)" }}>{initials(incomingName ?? "")}</div>
          <div className="co-head">
            <div className="co-name">{incomingName}</div>
            <div className="co-sub">Eingehender Anruf…</div>
            <div className="co-note">Sprich beim Annehmen in das Mikrofon</div>
          </div>
          <div className="co-controls">
            <button className="co-btn end" onClick={() => { const n = incomingName; setPhase("idle"); setIncomingName(null); if (n) postSignal(n, "decline", { reason: "user" }); onDismiss(); }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
            <button className="co-btn accept" onClick={() => void answer()}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === "outgoing") {
    return (
      <>
        <style>{css}</style>
        <div className="co-overlay">
          <div className="co-ring">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div className="co-head">
            <div className="co-name">{displayName}</div>
            <div className="co-sub">Anrufen…</div>
            <div className="co-note">{selfVideoOn ? "Video • " : "Audio • "}warten auf Annahme</div>
          </div>
          <button className="co-endbtn" onClick={hangup}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="co-overlay">
        {peerVideo && <video ref={remoteVideoRef} autoPlay playsInline className="co-video" />}
        {!peerVideo && (
          <div className="co-head">
            <div className="co-avatar" style={{ background: "linear-gradient(135deg,#5EEAD4,#2FA599)" }}>{initials(displayName)}</div>
            <div className="co-name">{displayName}</div>
            <div className="co-sub">{fmt(elapsed)}</div>
          </div>
        )}
        <div className="co-self-wrap">
          {selfVideo ? (
            <video ref={selfVideoRef} autoPlay playsInline muted className="co-self-video" />
          ) : (
            <div className="co-self-ph">{initials(me)}</div>
          )}
        </div>
        <div className="co-toprow">
          <span className="co-badge">{peerVideo ? "Video" : "Audio"} • {fmt(elapsed)}</span>
        </div>
        <div className="co-controls">
          <button className={`co-btn ${selfVideoOn ? "" : "co-btn off"}`} onClick={() => void toggleVideo()}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            <span className="co-label">Video</span>
          </button>
          <button className={`co-btn ${micOff ? "co-btn off" : ""}`} onClick={toggleMic}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{micOff ? <g><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-11 4.95"/><line x1="3" y1="3" x2="21" y2="21"/><line x1="12" y1="19" x2="12" y2="23"/></g> : <g><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></g>}</svg>
            <span className="co-label">Stumm</span>
          </button>
          <button className="co-btn end" onClick={hangup}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </div>
      </div>
    </>
  );
}
