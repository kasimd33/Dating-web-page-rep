from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl


class AgentCandidateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    linkedin_url: HttpUrl
    instagram_url: HttpUrl


class AgentCandidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    role: str
    location: str
    linkedin_url: str
    instagram_url: str
    avatar_url: str
    needs: list[str]
    hobbies: list[str]
    interests: list[str]
    qualities: list[str]
    agent_style: str
    source_status: Literal["curated", "analyzed"] = "curated"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RankedMatch(BaseModel):
    rank: int
    candidate: AgentCandidate
    score: int
    reason: str
    breakdown: dict[str, int]


class DateSessionCreate(BaseModel):
    candidate_id: str
    match_id: str


class DateTurn(BaseModel):
    speaker: str
    role: Literal["agent", "system"]
    message: str
    chemistry_delta: int = 0


class DateSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    candidate: AgentCandidate
    match: AgentCandidate
    venue: str
    venue_tag: str
    chemistry: int
    verdict: str
    turns: list[DateTurn]