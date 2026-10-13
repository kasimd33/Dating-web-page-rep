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

export interface RankedMatch {
  rank: number;
  candidate: AgentCandidate;
  score: number;
  reason: string;
  breakdown: Record<string, number>;
}

export interface DateSessionCreate {
  candidate_id: string;
  match_id: string;
}

export interface DateTurn {
  speaker: string;
  role: "agent" | "system";
  message: string;
  chemistry_delta: number;
}

export interface DateSession {
  id: string;
  candidate: AgentCandidate;
  match: AgentCandidate;
  venue: string;
  venue_tag: string;
  chemistry: number;
  verdict: string;
  turns: DateTurn[];
}