"use client";

import { useState, useRef, useEffect } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const CATEGORIES = [
  {
    name: "Zuletzt",
    icon: "🕐",
    emojis: [] as string[],
  },
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊",
      "😇","🥰","😍","🤩","😘","😗","😋","😛","😜","🤪",
      "😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐",
      "😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔",
      "😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶",
      "🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕",
      "🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦",
      "😧","😨","😰","😥","😢","😭","😱","😖","😣","😞",
      "😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿",
      "💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖",
      "😺","😸","😹","😻","😼","😽","🙀","😿","😾","🫠",
    ],
  },
  {
    name: "Gesten",
    icon: "👋",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌",
      "🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉",
      "👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛",
      "🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾",
      "🫷","🫸","🫗","🫙","🫠","🫣","🫢","🫤","🫥","🫦",
    ],
  },
  {
    name: "Menschen",
    icon: "👶",
    emojis: [
      "👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓",
      "👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇",
      "🤦","🤷","👮","🕵️","💂","🥷","👷","🫅","🤴","👸",
      "👳","👲","🧕","🤵","👰","🤰","🫃","🤱","👼","🎅",
      "🤶","🦸","🦹","🧙","🧚","🧛","🧜","🧞","🧟","🧌",
      "🧑‍🦰","🧑‍🦱","🧑‍🦳","🧑‍🦲","🧑‍🍳","🧑‍🎓","🧑‍🎤","🧑‍🔬","🧑‍🚀","🧑‍🚒",
    ],
  },
  {
    name: "Tiere",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨",
      "🐯","🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊",
      "🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉",
      "🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌",
      "🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢",
      "🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🪸",
      "🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆",
      "🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘",
      "🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐",
      "🦌","🐕","🐩","🦮","🐈","🐈‍⬛","🪶","🐓","🦃","🦤",
      "🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫",
    ],
  },
  {
    name: "Essen",
    icon: "🍔",
    emojis: [
      "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈",
      "🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦",
      "🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔",
      "🍠","🫘","🥜","🍞","🥐","🥖","🫓","🥨","🥯","🥞",
      "🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕","🌭",
      "🥪","🌮","🌯","🫔","🥙","🧆","🥚","🍳","🥘","🍲",
      "🫕","🥣","🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙",
      "🍚","🍛","🍜","🦪","🍝","🍠","🍢","🍣","🍤","🍥",
      "🥮","🍡","🥟","🥠","🥡","🦀","🦞","🦐","🦑","🍩",
      "🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯",
      "🍼","🥛","☕","🫖","🍵","🍶","🍾","🍷","🍸","🍹",
      "🍺","🍻","🥂","🥃","🫗","🥤","🧋","🧃","🧉","🧊",
    ],
  },
  {
    name: "Aktivitäten",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱",
      "🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳",
      "🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷",
      "⛸️","🥌","🎿","🎯","🎮","🕹️","🎲","🧩","🎰","🎭",
      "🎨","🧵","🧶","🎤","🎧","🎼","🎹","🥁","🪘","🎷",
      "🎺","🪗","🎸","🪕","🎻","🎬","🏆","🥇","🥈","🥉",
      "🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤹","🎭","🪅",
      "🪆","🎴","🎍","🎎","🎏","🎐","🎑","🧧","🎀","🎁",
      "🎗️","🎟️","🎫","🎖️","🏆","🏅","🥇","🥈","🥉","⚽",
    ],
  },
  {
    name: "Reisen",
    icon: "✈️",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐",
      "🛻","🚚","🚛","🚜","🛵","🏍️","🛺","🚲","🛴","🛹",
      "🛼","🚏","🛣️","🛤️","⛽","🛞","🚨","🚥","🚦","🛑",
      "🚧","⚓","🛟","⛵","🛶","🚤","🛳️","⛴️","🛥️","🚢",
      "✈️","🛩️","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡",
      "🛰️","🚀","🛸","🌍","🌎","🌏","🗺️","🧭","🏔️","⛰️",
      "🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️","🏟️","🏛️","🏗️",
      "🧱","🪨","🪵","🛖","🏘️","🏚️","🏠","🏡","🏢","🏣",
      "🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯",
      "🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩️","🕋",
    ],
  },
  {
    name: "Symbole",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝",
      "💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️",
      "🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸",
      "🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵",
      "🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕",
      "🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳",
      "🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️",
      "🔅","🔆","〽️","⚠️","🚸","🔱","⚜️","🔰","♻️","✅",
      "🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤",
      "🏧","🚾","♿","🅿️","🛗","🈳","🈂️","🛂","🛃","🛄",
      "🛅","🆎","🆑","🆘","🔴","🟠","🟡","🟢","🔵","🟣",
      "⚫","⚪","🟤","🔺","🔻","🔸","🔶","🔳","🔲","▪️",
      "▫️","◾","◽","◼️","◻️","🟥","🟧","🟨","🟩","🟦",
      "🟪","⬛","⬜","🟫","➕","➖","➗","✖️","🟰","♾️",
      "💲","💱","™️","©️","®️","〰️","➰","➿","🔚","🔙",
      "🔛","🔝","🔜","✔️","☑️","🔘","🔴","🟠","🟡","🟢",
    ],
  },
  {
    name: "Flags",
    icon: "🏁",
    emojis: [
      "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇺🇸","🇩🇪",
      "🇦🇹","🇨🇭","🇫🇷","🇬🇧","🇮🇹","🇪🇸","🇵🇹","🇳🇱","🇧🇪","🇸🇪",
      "🇳🇴","🇫🇮","🇩🇰","🇵🇱","🇨🇿","🇸🇰","🇭🇺","🇷🇴","🇧🇬","🇬🇷",
      "🇹🇷","🇷🇺","🇺🇦","🇨🇳","🇯🇵","🇰🇷","🇮🇳","🇧🇷","🇲🇽","🇦🇷",
      "🇨🇦","🇦🇺","🇳🇿","🇿🇦","🇪🇬","🇳🇬","🇰🇪","🇹🇭","🇻🇳","🇮🇩",
      "🇵🇭","🇲🇾","🇸🇬","🇧🇩","🇵🇰","🇱🇰","🇲🇲","🇰🇭","🇱🇦","🇹🇼",
    ],
  },
];

const RECENT_KEY = "familie:emojis:recent";

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string) {
  try {
    const recent = loadRecent().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 30)));
  } catch {}
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(1);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentEmojis(loadRecent());
  }, []);

  function handleSelect(emoji: string) {
    saveRecent(emoji);
    setRecentEmojis(loadRecent());
    onSelect(emoji);
  }

  const emojis =
    activeCategory === 0 ? recentEmojis : CATEGORIES[activeCategory].emojis;

  return (
    <>
      <style>{epCss}</style>
      <div className="ep-panel">
        {/* Header */}
        <div className="ep-header">
          <span className="ep-title">Emojis</span>
          <button className="ep-close" onClick={onClose} title="Schließen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="ep-tabs">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              className={`ep-tab ${i === activeCategory ? "active" : ""}`}
              onClick={() => setActiveCategory(i)}
              title={cat.name}
            >
              <span className="ep-tab-icon">{cat.icon}</span>
              {i === activeCategory && (
                <span className="ep-tab-label">{cat.name}</span>
              )}
            </button>
          ))}
        </div>

        {/* Emoji grid */}
        <div className="ep-grid" ref={gridRef}>
          <div className="ep-cat-label">
            {activeCategory === 0
              ? recentEmojis.length > 0
                ? "Zuletzt verwendet"
                : "Noch keine Emojis verwendet"
              : CATEGORIES[activeCategory].name}
          </div>
          <div className="ep-emojis">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className="ep-emoji"
                onClick={() => handleSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
            {activeCategory === 0 && recentEmojis.length === 0 && (
              <div className="ep-empty">
                Tippe ein Emoji und es erscheint hier.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const epCss = `
.ep-panel{position:absolute;bottom:calc(100% + 10px);right:0;width:360px;height:420px;border-radius:18px;background:#151A30;border:1px solid rgba(42,49,88,.8);box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 1px rgba(94,234,212,.04);z-index:91;display:flex;flex-direction:column;overflow:hidden;animation:epIn .25s cubic-bezier(.16,1,.3,1)}
.ep-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid rgba(42,49,88,.5)}
.ep-title{font-family:'Space Grotesk',system-ui;font-size:14px;font-weight:700;color:#EDEFFA;letter-spacing:.02em}
.ep-close{width:26px;height:26px;border-radius:7px;border:1px solid rgba(42,49,88,.6);background:rgba(29,35,66,.5);color:#8A90B8;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s}
.ep-close:hover{color:#EDEFFA;border-color:#8A90B8;background:rgba(29,35,66,1)}
.ep-tabs{display:flex;gap:3px;padding:8px 10px;border-bottom:1px solid rgba(42,49,88,.4);overflow-x:auto;scrollbar-width:none}
.ep-tabs::-webkit-scrollbar{display:none}
.ep-tab{display:flex;align-items:center;gap:4px;height:34px;padding:0 10px;border-radius:10px;border:none;background:transparent;font-size:16px;cursor:pointer;transition:.15s;flex-shrink:0;white-space:nowrap}
.ep-tab:hover{background:rgba(29,35,66,.8)}
.ep-tab.active{background:rgba(94,234,212,.1);border:1px solid rgba(94,234,212,.15)}
.ep-tab-icon{font-size:17px;line-height:1}
.ep-tab-label{font-size:11px;font-weight:600;color:#5EEAD4;font-family:'Space Grotesk',system-ui;letter-spacing:.02em}
.ep-grid{flex:1;overflow-y:auto;padding:6px 12px 14px}
.ep-grid::-webkit-scrollbar{width:5px}
.ep-grid::-webkit-scrollbar-track{background:transparent}
.ep-grid::-webkit-scrollbar-thumb{background:rgba(42,49,88,.6);border-radius:4px}
.ep-grid::-webkit-scrollbar-thumb:hover{background:rgba(42,49,88,.9)}
.ep-cat-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#5A6090;padding:6px 4px 8px;font-family:'Space Grotesk',system-ui}
.ep-emojis{display:grid;grid-template-columns:repeat(8,1fr);gap:3px}
.ep-emoji{width:100%;aspect-ratio:1;border:none;background:transparent;font-size:23px;cursor:pointer;border-radius:10px;display:flex;align-items:center;justify-content:center;transition:background .1s,transform .1s}
.ep-emoji:hover{background:rgba(29,35,66,.9);transform:scale(1.18)}
.ep-emoji:active{transform:scale(.92)}
.ep-empty{grid-column:1/-1;text-align:center;padding:24px 12px;font-size:12px;color:#4B5180;line-height:1.5}
@keyframes epIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
`;
