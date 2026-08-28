"use client";

import type { ChatMessage } from "@/lib/types";

interface AnnouncementCardProps {
  msg: ChatMessage;
  authorImage: string | null;
  authorColor: [string, string];
  meName: string;
  timeLabel: string;
}

const css = `
.ac{border-radius:16px;overflow:hidden;background:var(--bg-panel-2);border:1px solid var(--line);min-width:240px;max-width:320px;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.ac-head{display:flex;align-items:center;gap:10px;padding:11px 14px}
.ac-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#0D1026;overflow:hidden;flex-shrink:0}
.ac-who{display:flex;flex-direction:column;min-width:0;flex:1}
.ac-name{font-size:13px;font-weight:700;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-time{font-size:11px;color:var(--text-dim)}
.ac-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(94,234,212,.12);color:var(--accent);font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;border-radius:6px;flex-shrink:0}
.ac-img{width:100%;max-height:240px;object-fit:cover;display:block;cursor:pointer;background:rgba(0,0,0,.2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ac-body{padding:14px}
.ac-title{font-family:'Space Grotesk',system-ui;font-size:17px;font-weight:700;color:var(--text-main);line-height:1.3;margin-bottom:7px}
.ac-desc{font-size:13px;color:var(--text-dim);line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
.ac-desc:empty{display:none}
.ac-line{display:flex;align-items:center;gap:6px;border-top:1px solid var(--line);padding:10px 14px;font-size:12px;color:var(--text-dim)}
`;

const megaIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m22 2-7 7M15 4l-2 2-2 2 3 3 2-2 2-2M9 6a3 3 0 1 1-4 4l-1 1 3 3 1-1a3 3 0 0 1 4-4" />
  </svg>
);

export function AnnouncementCard({ msg, authorImage, authorColor, meName, timeLabel }: AnnouncementCardProps) {
  const initials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <>
      <style>{css}</style>
      <div className="ac">
        <div className="ac-head">
          <div className="ac-avatar" style={{ background: authorImage ? undefined : `linear-gradient(135deg,${authorColor[0]},${authorColor[1]})` }}>
            {authorImage ? <img src={authorImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(msg.author)}
          </div>
          <div className="ac-who">
            <div className="ac-name">{msg.author}{msg.author === meName ? " (du)" : ""}</div>
            <div className="ac-time">{timeLabel}</div>
          </div>
          <span className="ac-badge">{megaIcon} Ankündigung</span>
        </div>
        {msg.imageUrl && <img className="ac-img" src={msg.imageUrl} alt="Bild" />}
        <div className="ac-body">
          {msg.title && <div className="ac-title">{msg.title}</div>}
          {msg.description && <div className="ac-desc">{msg.description}</div>}
        </div>
        <div className="ac-line">
          {megaIcon} Ankündigung · {msg.author}{msg.author === meName ? " (du)" : ""}
        </div>
      </div>
    </>
  );
}
