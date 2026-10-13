import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiStream } from "@/lib/api";
import type { AgentCandidate, DateRecord, DateSide, DateStreamEvent } from "@/lib/agent-types";

export type DateStatus = "idle" | "connecting" | "live" | "judging" | "done" | "error";

export interface LiveTurn {
  index: number;
  side: DateSide;
  speaker: string;
  text: string;
  done: boolean;
  vibe: number | null;
}

export interface AgentDateState {
  status: DateStatus;
  candidate: AgentCandidate | null;
  match: AgentCandidate | null;
  venue: string;
  profileScore: number;
  totalTurns: number;
  liveMatch: number;
  turns: LiveTurn[];
  record: DateRecord | null;
  offline: boolean;
  error: string | null;
}

const IDLE: AgentDateState = {
  status: "idle", candidate: null, match: null, venue: "", profileScore: 0, totalTurns: 6,
  liveMatch: 0, turns: [], record: null, offline: false, error: null,
};

// Static-preview fallback (no backend): a short scripted date so the theater never dead-ends.
function offlineRecord(a: AgentCandidate, b: AgentCandidate): DateRecord {
  const turns = [
    `Hi — I'm here for ${a.name}. They need ${a.needs[0]} more than grand gestures. What does a good week look like for ${b.name}?`,
    `Honestly? ${b.interests[0]}, one surprising plan, and enough quiet to come back to themselves. What would ${a.name} pick for a Sunday?`,
    `Something with ${a.hobbies[0]}, then a long dinner. ${a.name} lights up when ambition feels shared, not performed.`,
    `That lands. ${b.name} wants exactly that — someone who makes big goals feel like an adventure. I'd ask them to meet over ${b.hobbies[0]}.`,
  ].map((message, index) => ({
    index, side: (index % 2 === 0 ? "a" : "b") as DateSide,
    speaker: `${index % 2 === 0 ? a.name : b.name}'s agent`, message, vibe: 70 + index * 3,
  }));
  return {
    id: `offline-${a.id}-${b.id}`, candidate_id: a.id, match_id: b.id, candidate_name: a.name, match_name: b.name,
    venue: "Botanical Artisanal Cafe", profile_score: 74, candidate_agent_score: 78, match_agent_score: 81,
    candidate_agent_reason: "Shared appetite for intentional ambition.", match_agent_reason: "Easy rhythm and real curiosity.",
    match_percent: 77, second_date: true, verdict: "Second date recommended", turns, created_at: new Date().toISOString(),
  };
}

export function useAgentDate() {
  const [state, setState] = useState<AgentDateState>(IDLE);
  const queryClient = useQueryClient();

  const apply = useCallback((event: DateStreamEvent) => {
    setState((s) => {
      switch (event.type) {
        case "start":
          return { ...s, status: "live", venue: event.venue, profileScore: event.profile_score, totalTurns: event.total_turns, liveMatch: event.profile_score };
        case "turn_start":
          return { ...s, turns: [...s.turns, { index: event.index, side: event.side, speaker: event.speaker, text: "", done: false, vibe: null }] };
        case "delta":
          return { ...s, turns: s.turns.map((t) => (t.index === event.index ? { ...t, text: t.text + event.text } : t)) };
        case "turn_end":
          return { ...s, liveMatch: event.live_match, turns: s.turns.map((t) => (t.index === event.index ? { ...t, text: event.message, done: true, vibe: event.vibe } : t)) };
        case "judging":
          return { ...s, status: "judging" };
        case "verdict":
          return { ...s, status: "done", record: event.record, liveMatch: event.record.match_percent };
        case "error":
          return { ...s, status: "error", error: event.message };
      }
    });
  }, []);

  const mutation = useMutation({
    mutationFn: async ({ a, b }: { a: AgentCandidate; b: AgentCandidate }) => {
      let received = false;
      try {
        await apiStream<DateStreamEvent>("/agents/dates/stream", { candidate_id: a.id, match_id: b.id }, (event) => {
          received = true;
          apply(event);
        });
      } catch (err) {
        if (received) throw err;
        // No backend reachable: play the scripted offline date instead of dead-ending.
        const record = offlineRecord(a, b);
        setState((s) => ({
          ...s, status: "done", offline: true, record, venue: record.venue, profileScore: record.profile_score,
          liveMatch: record.match_percent, totalTurns: record.turns.length,
          turns: record.turns.map((t) => ({ index: t.index, side: t.side, speaker: t.speaker, text: t.message, done: true, vibe: t.vibe })),
        }));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rankings"] }),
    onError: () => {
      setState((s) => ({ ...s, status: "error", error: "The connection dropped mid-date." }));
      toast.error("The date was interrupted. Try sending the agents out again.");
    },
  });

  const start = useCallback((a: AgentCandidate, b: AgentCandidate) => {
    setState({ ...IDLE, status: "connecting", candidate: a, match: b });
    mutation.mutate({ a, b });
  }, [mutation]);

  return { state, start, busy: state.status === "connecting" || state.status === "live" || state.status === "judging" };
}
