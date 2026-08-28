import { useCallback, useEffect, useRef, useState } from "react";

export default function CameraModal({
  onDone,
  onClose,
}: {
  onDone: (blob: Blob, isVideo: boolean, caption: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const facingRef = useRef<"user" | "environment">("environment");
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ blob: Blob; isVideo: boolean } | null>(null);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setErr("");
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingRef.current },
        audio: mode === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch {
      setErr("Kamera konnte nicht gestartet werden. Erlaube den Zugriff im Browser.");
    }
  }, [mode, stopStream]);

  useEffect(() => {
    void startStream();
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [startStream, stopStream]);

  function flipCamera() {
    facingRef.current = facingRef.current === "environment" ? "user" : "environment";
    void startStream();
  }

  function capturePhoto() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    let w = settings.width || video.videoWidth || 1280;
    let h = settings.height || video.videoHeight || 720;
    const MAX = 1600;
    if (Math.max(w, h) > MAX) {
      const scale = MAX / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingRef.current === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (b) => {
        if (b) {
          const url = URL.createObjectURL(b);
          setPreview(url);
          setCaptured({ blob: b, isVideo: false });
        }
      },
      "image/jpeg",
      0.85
    );
  }

  function startVideo() {
    const stream = streamRef.current;
    if (!stream || !ready) return;
    chunksRef.current = [];
    let mime = "video/webm";
    if (!MediaRecorder.isTypeSupported("video/webm")) mime = "video/mp4";
    try {
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        console.log("rec mime", rec.mimeType);
        const url = URL.createObjectURL(blob);
        setPreview(url);
        setCaptured({ blob, isVideo: true });
      };
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setErr("Videoaufnahme wird auf diesem Gerät nicht unterstützt.");
    }
  }

  function stopVideo() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }

  function cancelPreview() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCaptured(null);
  }

  function discard() {
    cancelPreview();
    facingRef.current = "environment";
    void startStream();
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    let out: Blob = f;
    if (!isVideo && f.type.startsWith("image/")) {
      try {
        out = await compressImage(f);
      } catch { /* keep original */ }
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(out));
    setCaptured({ blob: out, isVideo });
  }

  async function compressImage(file: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width;
    let h = bitmap.height;
    const MAX = 1600;
    if (Math.max(w, h) > MAX) {
      const scale = MAX / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); throw new Error(); }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error())), "image/jpeg", 0.85)
    );
    return blob;
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = String(elapsed).padStart(2, "0");

  return (
    <>
      <style>{css}</style>
      <div className="cm-overlay">
        <div className="cm-card">
          <div className="cm-topbar">
            <button className="cm-close" onClick={() => { stopVideo(); onClose(); }}>✕</button>
            <div className="cm-mode">
              <button className={`cm-mode-btn ${mode === "photo" ? "on" : ""}`} onClick={() => { setMode("photo"); }}>Foto</button>
              <button className={`cm-mode-btn ${mode === "video" ? "on" : ""}`} onClick={() => { setMode("video"); }}>Video</button>
            </div>
            <button className="cm-flip" onClick={flipCamera}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8V5h2v3M5 8a7 7 0 0 1 12-3l1 1M21 16v3h-2v-3M19 16a7 7 0 0 1-12 3l-1-1"/></svg>
            </button>
          </div>

          {preview && captured ? (
            <>
              <div className="cm-stage">
                {captured.isVideo ? (
                  <video src={preview} controls autoPlay playsInline className="cm-media" />
                ) : (
                  <img src={preview} alt="Foto" className="cm-media" />
                )}
              </div>
              <input className="cm-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder="Schreibe eine Notiz…" />
              <div className="cm-actions">
                <button className="cm-btn cm-btn-ghost" onClick={discard} disabled={sending}>Verwerfen</button>
                <button className="cm-btn cm-btn-primary" onClick={() => { if (!sending) { setSending(true); onDone(captured.blob, captured.isVideo, caption); } }} disabled={sending}>
                  {sending ? "Wird gesendet…" : "Senden"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="cm-stage">
                <video ref={videoRef} playsInline muted={mode === "photo"} className="cm-video" />
                {!ready && !err && <div className="cm-loading">Kamera wird gestartet…</div>}
                {err && <div className="cm-err">{err}</div>}
                {mode === "video" && recording && (
                  <div className="cm-rec-badge"><span className="cm-rec-dot" />REC {mm}:{String(elapsed % 60).padStart(2, "0")}</div>
                )}
              </div>
              <div className="cm-shutter-row">
                <button className="cm-gallery-btn" title="Aus Galerie wählen" onClick={() => fileRef.current?.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                </button>
                <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onGalleryPick} />
                {mode === "photo" ? (
                  <button className="cm-shutter" disabled={!ready} onClick={capturePhoto} aria-label="Foto aufnehmen" />
                ) : recording ? (
                  <button className="cm-shutter cm-shutter-rec" onClick={stopVideo} aria-label="Aufnahme beenden" />
                ) : (
                  <button className="cm-shutter" disabled={!ready} onClick={startVideo} aria-label="Video aufnehmen" />
                )}
                <div className="cm-gallery-btn" style={{ visibility: "hidden" }} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const css = `
.cm-overlay{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(4px);animation:cmFade .18s}
@keyframes cmFade{from{opacity:0}to{opacity:1}}
.cm-card{width:100%;max-width:420px;height:100%;max-height:86dvh;display:flex;flex-direction:column;background:#0D1026;border-radius:0 0 24px 24px;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
.cm-topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;flex-shrink:0}
.cm-close{width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#EDEFFA;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cm-close:active{transform:scale(.94)}
.cm-mode{display:flex;gap:4px;background:rgba(255,255,255,.08);border-radius:12px;padding:4px}
.cm-mode-btn{border:none;background:transparent;color:#8A90B8;font-family:'Space Grotesk',system-ui;font-size:13px;font-weight:600;padding:6px 16px;border-radius:9px;cursor:pointer;transition:.15s}
.cm-mode-btn.on{background:var(--accent);color:#0B1B20}
.cm-flip{width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#EDEFFA;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cm-flip:active{transform:scale(.94)}
.cm-stage{flex:1;position:relative;background:#000;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.cm-video{width:100%;height:100%;object-fit:cover}
.cm-media{width:100%;height:100%;object-fit:contain}
.cm-loading,.cm-err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8A90B8;font-size:13px;padding:20px;text-align:center;background:#000}
.cm-loading:after{content:"";width:18px;height:18px;margin-left:10px;border:2px solid rgba(94,234,212,.3);border-top-color:var(--accent);border-radius:50%;animation:cmSpin .6s linear infinite}
.cm-err{color:#f87171}
@keyframes cmSpin{to{transform:rotate(360deg)}}
.cm-rec-badge{position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:6px;background:rgba(0,0,0,.6);color:#fff;font-family:'Space Grotesk',system-ui;font-size:13px;font-weight:700;padding:6px 12px;border-radius:999px}
.cm-rec-dot{width:10px;height:10px;border-radius:50%;background:#f87171;animation:cmBlink 1s ease-in-out infinite}
@keyframes cmBlink{0%,100%{opacity:1}50%{opacity:.2}}
.cm-shutter-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 26px;flex-shrink:0}
.cm-gallery-btn{width:52px;height:52px;border-radius:14px;border:none;background:rgba(255,255,255,.08);color:#EDEFFA;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.12s}
.cm-gallery-btn:active{transform:scale(.94)}
.cm-shutter{width:66px;height:66px;border-radius:50%;border:4px solid var(--accent);background:transparent;cursor:pointer;position:relative;transition:transform .1s}
.cm-shutter:hover{transform:scale(1.04)}
.cm-shutter:active{transform:scale(.95)}
.cm-shutter:disabled{opacity:.4;cursor:default}
.cm-shutter:after{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--accent)}
.cm-shutter-rec{animation:cmRecPulse 1.2s ease-in-out infinite}
.cm-shutter-rec:after{background:#f87171;border-radius:8px;inset:22px}
@keyframes cmRecPulse{0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.5)}50%{box-shadow:0 0 0 14px rgba(248,113,113,0)}}
.cm-caption{width:calc(100% - 32px);margin:10px 16px 0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:10px 14px;color:#fff;font-size:14px;outline:none;font-family:inherit;flex-shrink:0}
.cm-caption::placeholder{color:#8A90B8}
.cm-actions{display:flex;gap:12px;padding:16px;justify-content:center;flex-shrink:0}
.cm-btn{font-family:'Space Grotesk',system-ui;font-size:14px;font-weight:700;padding:12px 26px;border-radius:14px;cursor:pointer;transition:.12s}
.cm-btn:active{transform:scale(.96)}
.cm-btn-ghost{border:1px solid rgba(255,255,255,.15);background:transparent;color:#EDEFFA}
.cm-btn-primary{border:none;background:var(--accent);color:#0B1B20}
`;
