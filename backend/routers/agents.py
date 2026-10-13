from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.seed_data import AVATARS
from models.agent import (
    AgentCandidate,
    AgentCandidateCreate,
    DateSession,
    DateSessionCreate,
    DateTurn,
    RankedMatch,
)

router = APIRouter(prefix="/agents", tags=["agents"])


def _candidate(doc: dict) -> AgentCandidate:
    doc.pop("_id", None)
    return AgentCandidate(**doc)


async def _get_candidate(candidate_id: str) -> AgentCandidate:
    doc = await db.candidates.find_one({"id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Agent candidate not found")
    return _candidate(doc)


@router.get("", response_model=list[AgentCandidate])
async def list_candidates():
    docs = await db.candidates.find().sort("created_at", 1).to_list(100)
    return [_candidate(doc) for doc in docs]


@router.get("/{candidate_id}", response_model=AgentCandidate)
async def get_candidate(candidate_id: str):
    return await _get_candidate(candidate_id)


@router.post("/analyze", response_model=AgentCandidate)
async def analyze_candidate(payload: AgentCandidateCreate):
    existing = await db.candidates.find_one({"linkedin_url": str(payload.linkedin_url)})
    if existing:
        return _candidate(existing)

    name = payload.name.strip()
    checksum = sum(ord(char) for char in name)
    record = AgentCandidate(
        name=name,
        role="Newly analyzed profile",
        location="Source links pending a deeper read",
        linkedin_url=str(payload.linkedin_url),
        instagram_url=str(payload.instagram_url),
        avatar_url=AVATARS[checksum % len(AVATARS)],
        needs=["clear communication", "shared momentum", "room to be themselves"],
        hobbies=["curious conversations", "city walks", "trying somewhere new"],
        interests=["creative work", "good questions", "building a life with intention"],
        qualities=["open-minded", "self-aware", "socially fluent"],
        agent_style="The fresh signal reader",
        source_status="analyzed",
    )
    await db.candidates.insert_one(record.model_dump())
    return record


@router.get("/{candidate_id}/rankings", response_model=list[RankedMatch])
async def rank_candidates(candidate_id: str):
    target = await _get_candidate(candidate_id)
    docs = await db.candidates.find({"id": {"$ne": candidate_id}}).to_list(100)
    matches = []
    for doc in docs:
        candidate = _candidate(doc)
        overlap = len(set(target.interests) & set(candidate.interests))
        score = 72 + ((sum(ord(char) for char in target.id + candidate.id) + overlap * 7) % 26)
        breakdown = {
            "values": min(98, score + (overlap * 2)),
            "energy": min(97, score - 2 + (len(candidate.hobbies) % 3)),
            "curiosity": min(99, score + 3),
        }
        common_interest = candidate.interests[overlap % len(candidate.interests)]
        matches.append(
            RankedMatch(
                rank=0,
                candidate=candidate,
                score=score,
                reason=f"Their {common_interest} signal pairs with {target.name}'s instinct for intention.",
                breakdown=breakdown,
            )
        )
    matches.sort(key=lambda item: item.score, reverse=True)
    return [item.model_copy(update={"rank": index + 1}) for index, item in enumerate(matches[:10])]


@router.post("/dates", response_model=DateSession)
async def start_date(payload: DateSessionCreate):
    candidate = await _get_candidate(payload.candidate_id)
    match = await _get_candidate(payload.match_id)
    shared = next((item for item in candidate.interests if item in match.interests), "building a life with intention")
    turns = [
        DateTurn(speaker="Venue", role="system", message="The Botanical Artisanal Cafe · two agents, no humans at the table yet.", chemistry_delta=0),
        DateTurn(speaker=candidate.name + "'s agent", role="agent", message=f"I noticed {candidate.name} values {candidate.needs[0]}. What does a good week feel like to you?", chemistry_delta=7),
        DateTurn(speaker=match.name + "'s agent", role="agent", message=f"A week with {shared}, one surprising plan, and enough quiet to come back to myself.", chemistry_delta=9),
        DateTurn(speaker=candidate.name + "'s agent", role="agent", message="That lands. My human needs someone who can make ambition feel like a shared adventure, not a performance.", chemistry_delta=8),
        DateTurn(speaker=match.name + "'s agent", role="agent", message=f"Then there is a signal here. I would ask them to meet over {match.hobbies[0]} and see what stays easy.", chemistry_delta=11),
        DateTurn(speaker="Chemistry engine", role="system", message="Both agents have requested a second date. The match is reciprocal.", chemistry_delta=0),
    ]
    chemistry = min(98, sum(turn.chemistry_delta for turn in turns))
    return DateSession(
        candidate=candidate,
        match=match,
        venue="Botanical Artisanal Cafe",
        venue_tag="COZY · CONVERSATIONAL",
        chemistry=chemistry,
        verdict="Second date recommended",
        turns=turns,
    )