"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ReactionSheetProps {
  msg: ChatMessage;
  onReact: (messageId: number, emoji: string) => void;
  onClose: () => void;
}

const QUICK = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

const EMOJIS = [
  "😀","😄","😂","🤣","😊","😇","🥰","😍","🤩","😘","😋","😜","🤪","😎","🤓","🥳","😏","😒","🙄","😬",
  "😢","😭","😱","😳","🥺","😡","😤","🤯","😴","🥱","🤗","🤔","🙃","😉","😌","😔","😪","🤤","😷","🤒",
  "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✊","👊","🤛","🤜","👏","🙌","👐",
  "🤝","🙏","💪","🦾","👋","🤚","🖐️","✋","🖖","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💖",
  "💗","💓","💞","💘","💝","🎉","🎊","🎈","🎁","✨","⭐","🌟","💫","🔥","⚡","💯","✅","❓","😐","🫡",
  "😑","😶","🤐","🤨","🫥","😕","🙁","😮","😯","😲","🥹","😦","😧","😨","😰","😥","😓","😩","🤬","👉"
];

const css = `
.rs-overlay{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);animation:rsFade .15s}
.rs-sheet{position:fixed;left:0;right:0;bottom:0;z-index:121;background:var(--bg-panel);border-top:1px solid var(--line);border-radius:20px 20px 0 0;padding:16px 14px calc(18px + env(safe-area-inset-bottom));animation:rsUp .28s cubic-bezier(.16,1,.3,1);display:flex;flex-direction:column;max-height:82dvh}
@keyframes rsUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes rsFade{from{opacity:0}to{opacity:1}}
.rs-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.rs-title{font-family:'Space Grotesk',system-ui;font-size:15px;font-weight:700;color:var(--text-main)}
.rs-x{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--bg-panel-2);color:var(--text-dim);cursor:pointer;font-size:16px}
.rs-x:hover{color:var(--text-main)}
.rs-quick{display:flex;gap:8px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.rs-q{font-size:26px;background:var(--bg-panel-2);border:1px solid var(--line);border-radius:14px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.12s;flex-shrink:0}
.rs-q:active{transform:scale(.88)}
.rs-q:hover{border-color:var(--accent-dim)}
.rs-label{font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.rs-body{flex:1;overflow-y:auto}
.rs-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding-bottom:8px}
.rs-e{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:24px;background:none;border:none;cursor:pointer;border-radius:8px;transition:background .1s}
.rs-e:hover{background:var(--bg-panel-2)}
.rs-e:active{transform:scale(.85)}
.rs-bubble-preview{background:var(--bubble-them);border-radius:10px;padding:7px 10px;color:var(--text-main);font-size:13px;margin-bottom:10px;word-wrap:break-word}
`;

export function ReactionSheet({ msg, onReact, onClose }: ReactionSheetProps) {
  return (
    <>
      <style>{css}</style>
      <div className="rs-overlay" onClick={onClose} />
      <div className="rs-sheet">
        <div className="rs-head">
          <div className="rs-title">Reagieren</div>
          <button className="rs-x" onClick={onClose}>✕</button>
        </div>
        {msg.content && <div className="rs-bubble-preview">{msg.content}</div>}

        <div className="rs-label">Schnell</div>
        <div className="rs-quick">
          {QUICK.map((e) => (
            <button key={e} className="rs-q" onClick={() => { onReact(msg.id, e); onClose(); }}>{e}</button>
          ))}
        </div>

        <div className="rs-label">Alle Emojis</div>
        <div className="rs-body">
          <div className="rs-grid">
            {EMOJIS.map((e) => (
              <button key={e} className="rs-e" onClick={() => { onReact(msg.id, e); onClose(); }}>{e}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
