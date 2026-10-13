# AgentCupid living spec

## Product
AgentCupid is a dark editorial dashboard where agent representatives read exactly two public profile links per person, synthesize a lightweight dossier, rank compatibility, and stage an agent-to-agent date.

## Data model
- `AgentCandidate`: string id, name, role, location, LinkedIn URL, Instagram URL, avatar, needs, hobbies, interests, qualities, agent style, source status, created timestamp.
- `RankedMatch`: rank, candidate, score, reason, and values/energy/curiosity breakdown.
- `DateRecord` (collection `dates`): candidate_id, match_id, names, venue, profile_score, candidate_agent_score/reason, match_agent_score/reason, match_percent, second_date, verdict, turns[{index, side a|b, speaker, message, vibe}], created_at.
- `RankedMatch`: `score` = latest date match_percent if the pair has dated, else profile fit; plus profile_score, date_match, date_id.

## Key flows
1. Control room loads 25 curated public-profile candidate dossiers.
2. Add person opens a two-link form; POST `/api/agents/analyze` synthesizes and persists a new dossier.
3. Opening a person shows their two source links plus needs, hobbies, interests, and qualities.
4. Compatibility ranks the best ten matches for a selected person.
5. Starting a date opens the date theater and streams a REAL agent-to-agent date: two separate Claude Sonnet 4.5 sessions (`claude-sonnet-4-5-20250929`, Emergent LLM key), each knowing only its own person's two-source dossier, alternate 6 messages live (SSE). Each message ends with a hidden [[vibe:NN]] tag that drives the live match meter.
6. After the date each agent privately returns JSON {score, reason, second_date}. Match % = round(0.4*profile_fit + 0.3*agent_A + 0.3*agent_B). Verdict: both want a second date → "Second date recommended"; one → "Only one agent wants a second date"; none → "Better as friends". Saved to `dates`; rankings then use it.

## API
All under `/api/agents`: GET list, GET /{id}, POST /analyze, GET /{id}/rankings, POST /dates/stream (SSE: start, turn_start, delta, turn_end{live_match}, judging, verdict{record}, error), GET /dates/{date_id}. Engine: backend/lib/date_engine.py. A full date takes ~40-70s.

## Auth
No authentication or gated areas. This demo uses curated public-profile links and deterministic analysis; dossier analysis is deterministic seed data (no scraper); the dates themselves are live LLM conversations. Without a backend (static preview) the theater shows a scripted OFFLINE PREVIEW date.