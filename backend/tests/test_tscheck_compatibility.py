import uuid


def test_created_person_gets_ranked_matches(client):
    suffix = uuid.uuid4().hex[:10]
    response = client.post("/agents/analyze", json={
        "name": f"tscheck-ranking-{suffix}",
        "linkedin_url": f"https://www.linkedin.com/in/tscheck-ranking-{suffix}",
        "instagram_url": f"https://www.instagram.com/tscheck_ranking_{suffix}/",
    })
    assert response.status_code == 200, response.text[:300]
    person = response.json()
    rankings = client.get(f"/agents/{person['id']}/rankings")
    assert rankings.status_code == 200, rankings.text[:300]
    matches = rankings.json()
    assert matches
    assert [item["rank"] for item in matches] == list(range(1, len(matches) + 1))
    for item in matches:
        assert isinstance(item["score"], int)
        assert item["reason"]
        assert item["candidate"]["id"] != person["id"]
