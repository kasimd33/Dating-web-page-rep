export interface AgentCandidateCreate {
  name: string;
  linkedin_url: string;
  instagram_url: string;
}

export interface AgentCandidate {
  id: string;
  name: string;
  role: string;
  location: string;
  linkedin_url: string;
  instagram_url: string;
  avatar_url: string;
  needs: string[];
  hobbies: string[];
  interests: string[];
  qualities: string[];
  agent_style: string;
  source_status: "curated" | "analyzed";
  created_at: string;
}

// Mirrors RankedMatch: score = date match % once the agents have dated, else profile fit.
export interface RankedMatch {
  rank: number;
  candidate: AgentCandidate;
  score: number;
  profile_score: number;
  date_match: number | null;
  date_id: string | null;
  reason: string;
  breakdown: Record<string, number>;
}

export interface DateSessionCreate {
  candidate_id: string;
  match_id: string;
}

export type DateSide = "a" | "b";

export interface DateTurn {
  index: number;
  side: DateSide;
  speaker: string;
  message: string;
  vibe: number;
}

export interface DateRecord {
  id: string;
  candidate_id: string;
  match_id: string;
  candidate_name: string;
  match_name: string;
  venue: string;
  profile_score: number;
  candidate_agent_score: number;
  match_agent_score: number;
  candidate_agent_reason: string;
  match_agent_reason: string;
  match_percent: number;
  second_date: boolean;
  verdict: string;
  turns: DateTurn[];
  created_at: string;
}

// Server-sent events from POST /api/agents/dates/stream (see backend/lib/date_engine.py).
export type DateStreamEvent =
  | { type: "start"; date_id: string; venue: string; profile_score: number; total_turns: number }
  | { type: "turn_start"; index: number; side: DateSide; speaker: string }
  | { type: "delta"; index: number; text: string }
  | { type: "turn_end"; index: number; side: DateSide; message: string; vibe: number; live_match: number }
  | { type: "judging" }
  | { type: "verdict"; record: DateRecord }
  | { type: "error"; message: string };
