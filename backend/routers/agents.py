import json
import logging
from datetime import timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from lib.date_engine import profile_score, run_date
from lib.db import db
from lib.seed_data import AVATARS
from models.agent import (
    AgentCandidate,
    AgentCandidateCreate,
    DateRecord,
    DateSessionCreate,
    RankedMatch,
)

router = APIRouter(prefix="/agents", tags=["agents"])
logger = logging.getLogger(__name__)


def _candidate(doc: dict) -> AgentCandidate:
    doc.pop("_id", None)
    return AgentCandidate(**doc)


def _date(doc: dict) -> DateRecord:
    doc.pop("_id", None)
    if doc.get("created_at") and doc["created_at"].tzinfo is None:
        doc["created_at"] = doc["created_at"].replace(tzinfo=timezone.utc)
    return DateRecord(**doc)


async def _get_candidate(candidate_id: str) -> AgentCandidate:
    doc = await db.candidates.find_one({"id": candidate_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Agent candidate not found")
    return _candidate(doc)


@router.get("", response_model=list[AgentCandidate])
async def list_candidates():
    docs = await db.candidates.find().sort("created_at", 1).to_list(200)
    return [_candidate(doc) for doc in docs]


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


@router.get("/dates/{date_id}", response_model=DateRecord)
async def get_date(date_id: str):
    doc = await db.dates.find_one({"id": date_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Date not found")
    return _date(doc)


@router.get("/{candidate_id}", response_model=AgentCandidate)
async def get_candidate(candidate_id: str):
    return await _get_candidate(candidate_id)


@router.get("/{candidate_id}/rankings", response_model=list[RankedMatch])
async def rank_candidates(candidate_id: str):
    target = await _get_candidate(candidate_id)
    docs = await db.candidates.find({"id": {"$ne": candidate_id}}).to_list(200)

    # Latest completed date per partner, whichever side started it.
    latest: dict[str, dict] = {}
    date_docs = await db.dates.find(
        {"$or": [{"candidate_id": candidate_id}, {"match_id": candidate_id}]}
    ).sort("created_at", -1).to_list(500)
    for d in date_docs:
        partner = d["match_id"] if d["candidate_id"] == candidate_id else d["candidate_id"]
        latest.setdefault(partner, d)

    matches = []
    for doc in docs:
        candidate = _candidate(doc)
        fit = profile_score(target, candidate)
        dated = latest.get(candidate.id)
        if dated:
            mine, theirs = (
                (dated["candidate_agent_score"], dated["match_agent_score"])
                if dated["candidate_id"] == candidate_id
                else (dated["match_agent_score"], dated["candidate_agent_score"])
            )
            reason = f"Agents dated at {dated['venue']}: {dated['verdict'].lower()}."
            breakdown = {"profile_fit": fit, "your_agent": mine, "their_agent": theirs}
        else:
            shared = set(target.interests + target.hobbies) & set(candidate.interests + candidate.hobbies)
            hook = next(iter(shared), candidate.interests[0])
            reason = f"Profile fit only — their {hook} signal pairs with {target.name}'s needs. Send the agents on a date."
            breakdown = {"profile_fit": fit}
        matches.append(
            RankedMatch(
                rank=0,
                candidate=candidate,
                score=dated["match_percent"] if dated else fit,
                profile_score=fit,
                date_match=dated["match_percent"] if dated else None,
                date_id=dated["id"] if dated else None,
                reason=reason,
                breakdown=breakdown,
            )
        )
    # Agent-verified matches (they actually dated) rank above profile-fit guesses.
    matches.sort(key=lambda item: (item.date_match is not None, item.score), reverse=True)
    return [item.model_copy(update={"rank": index + 1}) for index, item in enumerate(matches)]


@router.post("/dates/stream")
async def stream_date(payload: DateSessionCreate):
    """Server-sent events: start → (turn_start, delta*, turn_end)×N → judging → verdict."""
    if payload.candidate_id == payload.match_id:
        raise HTTPException(status_code=422, detail="An agent cannot date itself")
    a = await _get_candidate(payload.candidate_id)
    b = await _get_candidate(payload.match_id)

    async def events():
        try:
            async for event in run_date(a, b):
                if event["type"] == "verdict":
                    record = DateRecord(**event["record"])
                    await db.dates.insert_one(record.model_dump())
                    event = {"type": "verdict", "record": record.model_dump(mode="json")}
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:  # surface failures to the client instead of a silent hang
            logger.exception("date stream failed")
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)[:200]})}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
