import uuid


def test_created_profile_exposes_agent_analysis(client):
    suffix = uuid.uuid4().hex[:10]
    response = client.post("/agents/analyze", json={
        "name": f"tscheck-profile-{suffix}",
        "linkedin_url": f"https://www.linkedin.com/in/tscheck-profile-{suffix}",
        "instagram_url": f"https://www.instagram.com/tscheck_profile_{suffix}/",
    })
    assert response.status_code == 200, response.text[:300]
    person = response.json()
    assert person["agent_style"]
    for field in ("needs", "hobbies", "interests", "qualities"):
        assert isinstance(person[field], list) and person[field]
