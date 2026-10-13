import { useEffect, useRef } from "react";
import { BarChart3, CircleCheck, Heart, LoaderCircle, MessageCircle, RotateCcw, Scale, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentDateState, LiveTurn } from "@/hooks/useAgentDate";
import type { AgentCandidate } from "@/lib/agent-types";

// Hide the hidden [[vibe:NN]] tag (even half-streamed) and any *stage directions* while typing.
const spoken = (text: string) => text.replace(/\[\[[^\]]*\]?\]?/g, "").replace(/\*[^*]*\*?/g, "").replace(/\s+/g, " ").trim();

function Bubble({ turn, person }: { turn: LiveTurn; person: AgentCandidate | null }) {
  const text = spoken(turn.text);
  return (
    <div className={`chat-row chat-${turn.side}`} data-testid={`date-message-${turn.index}`}>
      {person && <img src={person.avatar_url} alt={`${person.name} agent`} className="chat-avatar" data-testid={`date-message-avatar-${turn.index}`} />}
      <div className="chat-bubble-wrap">
        <div className="chat-meta">
          <span data-testid={`date-message-speaker-${turn.index}`}>{turn.speaker}</span>
          {turn.done && turn.vibe !== null && <span className="chat-vibe" data-testid={`date-message-vibe-${turn.index}`}>vibe {turn.vibe}%</span>}
        </div>
        <div className="chat-bubble" data-testid={`date-message-text-${turn.index}`}>
          {text || <span className="typing-dots" data-testid={`date-typing-${turn.index}`}><i /><i /><i /></span>}
          {!turn.done && text && <span className="stream-caret" />}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, weight, value, reason, testid }: { label: string; weight: string; value: number; reason?: string; testid: string }) {
  return (
    <div className="score-row" data-testid={testid}>
      <div className="score-row-top">
        <span>{label} <em>{weight}</em></span>
        <strong data-testid={`${testid}-value`}>{value}%</strong>
      </div>
      <div className="meter-track"><span style={{ width: `${value}%` }} /></div>
      {reason && <p data-testid={`${testid}-reason`}>“{reason}”</p>}
    </div>
  );
}

export default function DateTheater({ date, onBrowse, onRestart }: { date: AgentDateState; onBrowse: () => void; onRestart: () => void }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const lastText = date.turns.at(-1)?.text.length ?? 0;
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [date.turns.length, lastText, date.status]);

  if (date.status === "idle" || !date.candidate || !date.match) {
    return (
      <div className="date-empty" data-testid="date-empty">
        <div className="empty-icon"><MessageCircle size={22} /></div>
        <div className="eyebrow">DATE THEATER</div>
        <h1 data-testid="date-empty-title">No date on stage yet.</h1>
        <p data-testid="date-empty-copy">Pick a ranked match and send both agents out. You'll watch them talk live, then see the match percentage.</p>
        <Button onClick={onBrowse} className="primary-action" data-testid="date-browse-rankings-button"><BarChart3 size={16} /> Browse compatibility</Button>
      </div>
    );
  }

  const { candidate, match, record } = date;
  const people = { a: candidate, b: match };
  const doneTurns = date.turns.filter((t) => t.done).length;
  const statusLabel = {
    connecting: "AGENTS ARRIVING", live: "LIVE AGENT DATE", judging: "AGENTS DELIBERATING",
    done: date.offline ? "OFFLINE PREVIEW" : "DATE COMPLETE", error: "DATE INTERRUPTED", idle: "",
  }[date.status];

  return (
    <div className="view-stack" data-testid="date-theater-view">
      <section className="date-stage-header" data-testid="date-stage-header">
        <div>
          <div className="eyebrow" data-testid="date-status-label">
            {date.status === "done" ? <CircleCheck size={11} className="inline-icon" /> : <span className="live-dot inline-dot" />} {statusLabel}
            {date.venue && <> · {date.venue.toUpperCase()}</>}
          </div>
          <h1 data-testid="date-stage-title">{candidate.name.split(" ")[0]} <em>&amp;</em> {match.name.split(" ")[0]}</h1>
          <p data-testid="date-stage-copy">Two AI agents, each knowing only its own person's LinkedIn + Instagram, dating on their behalf.</p>
        </div>
        <div className="chemistry-meter" data-testid="match-meter">
          <span className="micro-label">{date.status === "done" ? "FINAL MATCH" : "LIVE MATCH"}</span>
          <strong data-testid="match-meter-value">{date.liveMatch ? `${date.liveMatch}%` : "—"}</strong>
          <div className="meter-track"><span style={{ width: `${date.liveMatch}%` }} /></div>
          <span className="meter-caption" data-testid="match-meter-progress">Beat {Math.min(doneTurns + (date.status === "live" ? 1 : 0), date.totalTurns)} / {date.totalTurns}</span>
        </div>
      </section>

      <div className="date-scene chat-scene" data-testid="date-scene">
        <div className="scene-glow" />
        <div className="chat-feed" ref={feedRef} data-testid="date-chat-feed">
          {date.status === "connecting" && (
            <div className="chat-system" data-testid="date-connecting"><LoaderCircle size={14} className="spin" /> Both agents are reading their person's two sources and heading to the venue…</div>
          )}
          {date.turns.map((turn) => <Bubble key={turn.index} turn={turn} person={people[turn.side]} />)}
          {date.status === "judging" && (
            <div className="chat-system" data-testid="date-judging"><Scale size={14} /> The date is over. Each agent is privately scoring it for their person…</div>
          )}
          {date.status === "error" && <div className="chat-system chat-error" data-testid="date-error">{date.error}</div>}
        </div>
      </div>

      {record && (
        <section className="verdict-card" data-testid="date-verdict">
          <div className="verdict-main">
            <span className="verdict-kicker"><Heart size={12} fill="currentColor" /> THE AGENTS' VERDICT</span>
            <strong data-testid="date-verdict-text">{record.verdict}</strong>
            <div className="verdict-percent" data-testid="date-match-percent">{record.match_percent}<small>%</small></div>
            <span className="verdict-sub">match between {record.candidate_name} and {record.match_name}</span>
          </div>
          <div className="verdict-breakdown" data-testid="date-score-breakdown">
            <ScoreRow testid="score-profile-fit" label="Profile fit" weight="40%" value={record.profile_score} reason="Needs, hobbies, interests and qualities from both dossiers." />
            <ScoreRow testid="score-candidate-agent" label={`${record.candidate_name}'s agent`} weight="30%" value={record.candidate_agent_score} reason={record.candidate_agent_reason} />
            <ScoreRow testid="score-match-agent" label={`${record.match_name}'s agent`} weight="30%" value={record.match_agent_score} reason={record.match_agent_reason} />
          </div>
        </section>
      )}

      <div className="date-bottom-row" data-testid="date-bottom-row">
        <div className="next-beat-copy" data-testid="date-footer-copy">
          <Sparkles size={13} className="inline-icon" /> Match % = 40% profile fit + 30% each agent's post-date score.
        </div>
        <Button variant="outline" onClick={onBrowse} className="ghost-action" data-testid="date-back-rankings-button"><BarChart3 size={15} /> Rankings</Button>
        <Button onClick={onRestart} disabled={!["done", "error"].includes(date.status)} className="primary-action" data-testid="date-again-button">
          <RotateCcw size={15} /> Date again
        </Button>
      </div>
    </div>
  );
}
