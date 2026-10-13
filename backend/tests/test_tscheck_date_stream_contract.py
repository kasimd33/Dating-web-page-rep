import json
import uuid

import httpx

from tests.conftest import API_URL


def _make_candidate(client, label, suffix):
    response = client.post("/agents/analyze", json={
        "name": f"tscheck-stream-{label}-{suffix}",
        "linkedin_url": f"https://www.linkedin.com/in/tscheck-stream-{label}-{suffix}",
        "instagram_url": f"https://www.instagram.com/tscheck_stream_{label}_{suffix}/",
    })
    assert response.status_code == 200, response.text[:300]
    return response.json()["id"]


def _parse_sse(raw_text: str):
    events = []
    for block in raw_text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        for line in block.splitlines():
            if line.startswith("data:"):
                events.append(json.loads(line[len("data:"):].strip()))
    return events


def test_date_stream_error_cases(client):
    suffix = uuid.uuid4().hex[:10]
    cand_id = _make_candidate(client, "a", suffix)

    # self-date -> 422
    response = client.post("/agents/dates/stream", json={"candidate_id": cand_id, "match_id": cand_id})
    assert response.status_code == 422, response.text[:300]

    # unknown id -> 404
    response = client.post("/agents/dates/stream", json={"candidate_id": cand_id, "match_id": "does-not-exist"})
    assert response.status_code == 404, response.text[:300]

    # GET unknown date -> 404
    response = client.get("/agents/dates/does-not-exist")
    assert response.status_code == 404, response.text[:300]


def test_date_stream_full_sequence_and_saved_record(client):
    suffix = uuid.uuid4().hex[:10]
    a_id = _make_candidate(client, "a", suffix)
    b_id = _make_candidate(client, "b", suffix)

    with httpx.Client(base_url=API_URL, timeout=200.0) as streaming_client:
        with streaming_client.stream("POST", "/agents/dates/stream", json={"candidate_id": a_id, "match_id": b_id}) as response:
            assert response.status_code == 200, "expected 200 streaming response"
            assert "text/event-stream" in response.headers.get("content-type", "")
            raw = ""
            for chunk in response.iter_text():
                raw += chunk
    events = _parse_sse(raw)
    types = [e["type"] for e in events]

    assert types[0] == "start"
    assert "turn_start" in types
    assert "delta" in types
    assert "turn_end" in types
    assert "judging" in types
    assert types[-1] == "verdict"

    turn_ends = [e for e in events if e["type"] == "turn_end"]
    assert len(turn_ends) == 6, f"expected 6 turn_end events, got {len(turn_ends)}"
    for te in turn_ends:
        assert "live_match" in te and isinstance(te["live_match"], int)

    verdict_event = events[-1]
    record = verdict_event["record"]
    assert record["candidate_id"] == a_id
    assert record["match_id"] == b_id
    assert 0 <= record["match_percent"] <= 100
    fit = record["profile_score"]
    score_a = record["candidate_agent_score"]
    score_b = record["match_agent_score"]
    expected = round(0.4 * fit + 0.3 * score_a + 0.3 * score_b)
    assert abs(record["match_percent"] - expected) <= 1

    # saved record retrievable
    saved = client.get(f"/agents/dates/{record['id']}")
    assert saved.status_code == 200, saved.text[:300]
    assert saved.json()["match_percent"] == record["match_percent"]
