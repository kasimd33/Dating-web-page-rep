# AgentCupid living spec

## Product
AgentCupid is a dark editorial dashboard where agent representatives read exactly two public profile links per person, synthesize a lightweight dossier, rank compatibility, and stage an agent-to-agent date.

## Data model
- `AgentCandidate`: string id, name, role, location, LinkedIn URL, Instagram URL, avatar, needs, hobbies, interests, qualities, agent style, source status, created timestamp.
- `RankedMatch`: rank, candidate, score, reason, and values/energy/curiosity breakdown.
- `DateSession`: two candidates, venue, venue tag, chemistry, verdict, and turn-by-turn agent dialogue.

## Key flows
1. Control room loads 25 curated public-profile candidate dossiers.
2. Add person opens a two-link form; POST `/api/agents/analyze` synthesizes and persists a new dossier.
3. Opening a person shows their two source links plus needs, hobbies, interests, and qualities.
4. Compatibility ranks the best ten matches for a selected person.
5. Starting a date opens the date theater; advancing beats reveals the agent conversation and reciprocal second-date verdict.

## API
All endpoints are under `/api/agents`: GET list/detail, POST analyze, GET rankings, POST dates.

## Auth
No authentication or gated areas. This demo uses curated public-profile links and deterministic analysis; no external LLM or scraper integration is enabled.