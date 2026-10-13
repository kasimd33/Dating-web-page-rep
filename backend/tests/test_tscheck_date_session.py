import uuid


def test_date_session_returns_turns_chemistry_and_verdict(client):
    suffix = uuid.uuid4().hex[:10]
    created = []
    for label in ("first", "second"):
        response = client.post("/agents/analyze", json={
            "name": f"tscheck-date-{label}-{suffix}",
            "linkedin_url": f"https://www.linkedin.com/in/tscheck-date-{label}-{suffix}",
            "instagram_url": f"https://www.instagram.com/tscheck_date_{label}_{suffix}/",
        })
        assert response.status_code == 200, response.text[:300]
        created.append(response.json()["id"])
    response = client.post("/agents/dates", json={"candidate_id": created[0], "match_id": created[1]})
    assert response.status_code == 200, response.text[:300]
    session = response.json()
    assert session["chemistry"] > 0
    assert len(session["turns"]) >= 3
    assert session["verdict"]
    assert any(turn["role"] == "agent" for turn in session["turns"])
