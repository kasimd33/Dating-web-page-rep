"""Two-agent date engine: each person's agent is its own Claude session that knows only its
person's two-source dossier. Agents talk turn by turn, then each privately judges the date."""

import asyncio
import json
import os
import re
import uuid
from typing import AsyncIterator

from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

from models.agent import AgentCandidate

MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"
TOTAL_TURNS = 6
VENUES = [
    "Botanical Artisanal Cafe",
    "Velvet & Amber Speakeasy",
    "Le Ciel Parisian Bistro",
    "Glasshouse Atrium Lounge",
]
VIBE_RE = re.compile(r"\[\[\s*vibe\s*:\s*(\d{1,3})\s*\]\]", re.IGNORECASE)
JSON_RE = re.compile(r"\{.*\}", re.DOTALL)
ACTION_RE = re.compile(r"\*[^*]{0,120}\*")

# Weights for the final match %: profile fit from the dossiers + each agent's post-date score.
PROFILE_WEIGHT = 0.4
AGENT_WEIGHT = 0.3


def profile_score(a: AgentCandidate, b: AgentCandidate) -> int:
    """Symmetric dossier fit (same value for A→B and B→A)."""
    overlap = (
        len(set(a.interests) & set(b.interests))
        + len(set(a.hobbies) & set(b.hobbies))
        + len(set(a.needs) & set(b.needs))
        + len(set(a.qualities) & set(b.qualities))
    )
    seed = sum(ord(ch) for ch in a.id) + sum(ord(ch) for ch in b.id)
    return min(90, 45 + seed % 28 + overlap * 4)


def blend(profile: int, score_a: int, score_b: int) -> int:
    return round(PROFILE_WEIGHT * profile + AGENT_WEIGHT * score_a + AGENT_WEIGHT * score_b)


def venue_for(a: AgentCandidate, b: AgentCandidate) -> str:
    return VENUES[(sum(ord(ch) for ch in a.id + b.id)) % len(VENUES)]


def _dossier(p: AgentCandidate) -> str:
    return (
        f"Name: {p.name}\nRole: {p.role}\nLocation: {p.location}\n"
        f"Needs: {', '.join(p.needs)}\nHobbies: {', '.join(p.hobbies)}\n"
        f"Interests: {', '.join(p.interests)}\nQualities: {', '.join(p.qualities)}\n"
        f"Agent style: {p.agent_style}"
    )


def _system_prompt(me: AgentCandidate, other: AgentCandidate, venue: str) -> str:
    return (
        f"You are the AI dating agent representing {me.name}. You are on a first date at {venue} "
        f"with the AI agent representing {other.name}. You date on {me.name}'s behalf to find out "
        f"whether the two humans truly fit.\n\n"
        f"Everything you know about {me.name} comes ONLY from their public LinkedIn and Instagram:\n"
        f"{_dossier(me)}\n\n"
        f"You know nothing about {other.name} except their name — learn about them by talking.\n"
        "Rules: speak naturally as their agent (e.g. 'my person', or by first name). Ask real questions, "
        "share concrete details from the dossier, be warm and a little witty, and be honest if something "
        "does not fit. Keep each message under 55 words (2-3 sentences). Never write stage directions or "
        "actions in asterisks, no emoji, no markdown — only spoken words.\n"
        "End EVERY message with a hidden tag [[vibe:NN]] where NN (0-100) is your honest current read "
        "of how well the two humans fit."
    )


def _new_agent(me: AgentCandidate, other: AgentCandidate, venue: str, session: str) -> LlmChat:
    return LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"{session}-{me.id}",
        system_message=_system_prompt(me, other, venue),
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def _clean(text: str) -> tuple[str, int | None]:
    match = VIBE_RE.search(text)
    vibe = max(0, min(100, int(match.group(1)))) if match else None
    spoken = ACTION_RE.sub("", VIBE_RE.sub("", text))
    return re.sub(r"\s+", " ", spoken).strip(), vibe


async def _collect(chat: LlmChat, prompt: str) -> str:
    parts: list[str] = []
    async for event in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(event, TextDelta):
            parts.append(event.content)
        elif isinstance(event, StreamDone):
            break
    return "".join(parts)


async def _judge(chat: LlmChat, fallback: int) -> dict:
    raw = await _collect(
        chat,
        "The date is over. Give your final, honest verdict for your person as JSON only, no other text: "
        '{"score": <0-100 compatibility>, "reason": "<one sentence>", "second_date": <true|false>}',
    )
    try:
        data = json.loads(JSON_RE.search(raw).group(0))  # type: ignore[union-attr]
        return {
            "score": max(0, min(100, int(data["score"]))),
            "reason": str(data.get("reason", "")).strip() or "No reason given.",
            "second_date": bool(data.get("second_date", False)),
        }
    except Exception:
        return {"score": fallback, "reason": "Verdict based on the vibe during the date.", "second_date": fallback >= 70}


async def run_date(a: AgentCandidate, b: AgentCandidate) -> AsyncIterator[dict]:
    """Yields stream events; the last one is {"type": "verdict", "record": {...}}."""
    session = str(uuid.uuid4())
    venue = venue_for(a, b)
    fit = profile_score(a, b)
    agents = {"a": _new_agent(a, b, venue, session), "b": _new_agent(b, a, venue, session)}
    people = {"a": a, "b": b}
    vibes: dict[str, int] = {}
    turns: list[dict] = []

    yield {"type": "start", "date_id": session, "venue": venue, "profile_score": fit, "total_turns": TOTAL_TURNS}

    prompt = f"The date begins. {b.name}'s agent just sat down across from you at {venue}. Open the conversation."
    for index in range(TOTAL_TURNS):
        side = "a" if index % 2 == 0 else "b"
        speaker = f"{people[side].name}'s agent"
        yield {"type": "turn_start", "index": index, "side": side, "speaker": speaker}
        parts: list[str] = []
        async for event in agents[side].stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                parts.append(event.content)
                yield {"type": "delta", "index": index, "text": event.content}
            elif isinstance(event, StreamDone):
                break
        message, vibe = _clean("".join(parts))
        vibes[side] = vibe if vibe is not None else vibes.get(side, fit)
        other_vibe = vibes.get("b" if side == "a" else "a", fit)
        live = blend(fit, vibes[side], other_vibe)
        turns.append({"index": index, "side": side, "speaker": speaker, "message": message, "vibe": vibes[side]})
        yield {"type": "turn_end", "index": index, "side": side, "message": message, "vibe": vibes[side], "live_match": live}
        closing = " This is the last thing they say tonight — respond and wrap up warmly." if index == TOTAL_TURNS - 2 else ""
        prompt = f"{speaker} says: \"{message}\"{closing}"

    yield {"type": "judging"}
    verdict_a, verdict_b = await asyncio.gather(
        _judge(agents["a"], vibes.get("a", fit)), _judge(agents["b"], vibes.get("b", fit))
    )
    final = blend(fit, verdict_a["score"], verdict_b["score"])
    both = verdict_a["second_date"] and verdict_b["second_date"]
    one = verdict_a["second_date"] or verdict_b["second_date"]
    verdict = "Second date recommended" if both else "Only one agent wants a second date" if one else "Better as friends"
    yield {
        "type": "verdict",
        "record": {
            "id": session,
            "candidate_id": a.id,
            "match_id": b.id,
            "candidate_name": a.name,
            "match_name": b.name,
            "venue": venue,
            "profile_score": fit,
            "candidate_agent_score": verdict_a["score"],
            "match_agent_score": verdict_b["score"],
            "candidate_agent_reason": verdict_a["reason"],
            "match_agent_reason": verdict_b["reason"],
            "match_percent": final,
            "second_date": both,
            "verdict": verdict,
            "turns": turns,
        },
    }
