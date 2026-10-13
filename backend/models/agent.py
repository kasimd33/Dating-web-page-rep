from datetime import datetime, timezone
from typing import Literal, Optional
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
    score: int  # date match % when the agents have dated, otherwise profile fit
    profile_score: int
    date_match: Optional[int] = None
    date_id: Optional[str] = None
    reason: str
    breakdown: dict[str, int]


class DateSessionCreate(BaseModel):
    candidate_id: str
    match_id: str


class DateTurn(BaseModel):
    index: int
    side: Literal["a", "b"]
    speaker: str
    message: str
    vibe: int


class DateRecord(BaseModel):
    id: str
    candidate_id: str
    match_id: str
    candidate_name: str
    match_name: str
    venue: str
    profile_score: int
    candidate_agent_score: int
    match_agent_score: int
    candidate_agent_reason: str
    match_agent_reason: str
    match_percent: int
    second_date: bool
    verdict: str
    turns: list[DateTurn]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
