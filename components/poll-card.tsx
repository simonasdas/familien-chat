"use client";

import { useState } from "react";
import type { Poll } from "@/lib/types";

interface PollCardProps {
  poll: Poll;
  meName: string;
  onVoted: (poll: Poll) => void;
}

const css = `
.pc{border-radius:12px;overflow:hidden;background:var(--bg-panel-2);border:1px solid var(--line);min-width:220px;max-width:280px}
.pc-head{padding:10px 12px;border-bottom:1px solid var(--line)}
.pc-q{font-family:'Space Grotesk',system-ui;font-size:14px;font-weight:600;color:var(--text-main);line-height:1.3}
.pc-meta{font-size:10px;color:var(--text-dim);margin-top:4px}
.pc-opts{padding:8px}
.pc-opt{display:flex;align-items:center;width:100%;gap:8px;padding:9px 8px;border-radius:9px;background:var(--bg-panel);cursor:pointer;transition:.12s;margin-bottom:6px}
.pc-opt:last-child{margin-bottom:0}
.pc-opt:hover{background:var(--bg-panel-2)}
.pc-opt.disabled{cursor:default}
.pc-opt.picked{background:rgba(94,234,212,.08);outline:1px solid rgba(94,234,212,.4)}
.pc-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--text-dim);flex-shrink:0;display:flex;align-items:center;justify-content:center}
.pc-opt.picked .pc-radio{border-color:var(--accent)}
.pc-opt.picked .pc-radio::after{content:'';width:10px;height:10px;border-radius:50%;background:var(--accent)}
.pc-opt-text{flex:1;font-size:13px;color:var(--text-main);text-align:left}
.pc-opt-count{font-size:11px;color:var(--text-dim);flex-shrink:0}
.pc-foot{padding:6px 12px 8px;font-size:10px;color:var(--text-dim);border-top:1px solid var(--line)}
.pc-barwrap{width:100%;height:4px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;margin-top:2px}
.pc-bar{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-dim));transition:width .3s}
.pc-arrow{width:26px;height:26px;border-radius:50%;border:none;background:transparent;color:var(--text-dim);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:color .12s}
.pc-arrow:hover{color:var(--text-main)}
.pc-arrow .chev{transition:transform .2s}
.pc-arrow.open .chev{transform:rotate(180deg)}
.pc-opt-voters{margin:2px 2px 4px;padding:6px 8px;background:rgba(0,0,0,.18);border-radius:8px;animation:pcIn .18s ease-out}
.pc-voters-label{font-size:10px;color:var(--text-dim);margin-bottom:4px}
.pc-detail-voters{display:flex;flex-wrap:wrap;gap:4px}
.pc-voter{font-size:10px;background:var(--bg-panel);border-radius:6px;padding:2px 7px;color:var(--text-dim)}
.pc-voter.me{background:rgba(94,234,212,.12);color:var(--accent)}
@keyframes pcIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
`;

const chevIcon = (
  <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function PollCard({ poll, meName, onVoted }: PollCardProps) {
  const [taking, setTaking] = useState(false);
  const [voteErr, setVoteErr] = useState(false);
  const [openOpts, setOpenOpts] = useState<number[]>([]);
  const myPickId = poll.anonymous
    ? (poll.options.find((o) => o.picked)?.id ?? null)
    : (poll.voters.find((v) => v.voter === meName)?.optionId ?? null);
  const reacted = myPickId != null;

  function toggleOpt(optionId: number) {
    setOpenOpts((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  }

  async function select(optionId: number) {
    if (taking || reacted) return;
    setTaking(true);
    setVoteErr(false);
    try {
      const res = await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVoteErr(true);
        return;
      }
      if (data?.poll) onVoted(data.poll as Poll);
    } catch {
      setVoteErr(true);
    } finally {
      setTaking(false);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="pc">
        <div className="pc-head">
          <div className="pc-q">{poll.question}</div>
          <div className="pc-meta">
            Umfrage · {poll.totalVotes} {poll.totalVotes === 1 ? "Stimme" : "Stimmen"}
            {poll.anonymous ? " · anonym" : ""}
          </div>
        </div>

        <div className="pc-opts">
          {poll.options.map((o) => {
            const pct = poll.totalVotes > 0 ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
            const isPicked = myPickId === o.id;
            const pickColor = isPicked ? "var(--accent)" : undefined;
            const isOpen = openOpts.includes(o.id);
            const voters = poll.anonymous
              ? []
              : poll.voters.filter((v) => v.optionId === o.id).map((v) => v.voter);
            const optClass =
              "pc-opt" + (reacted ? " disabled" : "") + (isPicked ? " picked" : "");
            return (
              <div key={o.id}>
                <div className={optClass} onClick={() => void select(o.id)}>
                  <div className="pc-radio" style={pickColor ? { borderColor: pickColor } : undefined} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pc-opt-text">{o.text}</div>
                    {reacted && (
                      <div className="pc-barwrap">
                        <div className="pc-bar" style={{ width: pct + "%" }} />
                      </div>
                    )}
                  </div>
                  {reacted && (
                    <span className="pc-opt-count" style={isPicked ? { color: "var(--accent)" } : undefined}>
                      {pct}%
                    </span>
                  )}
                  <button
                    type="button"
                    className={"pc-arrow" + (isOpen ? " open" : "")}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOpt(o.id);
                    }}
                    title="Zeigt, wer für diese Antwort gestimmt hat"
                  >
                    {chevIcon}
                  </button>
                </div>
                {isOpen && (
                  <div className="pc-opt-voters">
                    {poll.anonymous ? (
                      <div className="pc-voters-label">Anonym - Stimmen nicht sichtbar.</div>
                    ) : voters.length === 0 ? (
                      <div className="pc-voters-label">Noch keine Stimmen für diese Antwort.</div>
                    ) : (
                      <>
                        <div className="pc-voters-label">{o.text}</div>
                        <div className="pc-detail-voters">
                          {voters.map((v, i) => (
                            <span key={i} className={"pc-voter" + (v === meName ? " me" : "")}>
                              {v}
                              {v === meName ? " (du)" : ""}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pc-foot">
          {voteErr ? (
            <span style={{ color: "#f87171" }}>Fehler - bitte einloggen und erneut tippen</span>
          ) : reacted ? (
            <span style={{ color: "var(--accent)" }}>Ihre Stimme wurde gezaehlt</span>
          ) : (
            <span>Abstimmen - tippe auf eine Antwort</span>
          )}
        </div>
      </div>
    </>
  );
}
