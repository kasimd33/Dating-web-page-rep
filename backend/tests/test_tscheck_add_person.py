import uuid


def test_add_person_analyzes_and_persists_three_inputs(client):
    suffix = uuid.uuid4().hex[:10]
    payload = {
        "name": f"tscheck-add-{suffix}",
        "linkedin_url": f"https://www.linkedin.com/in/tscheck-add-{suffix}",
        "instagram_url": f"https://www.instagram.com/tscheck_add_{suffix}/",
    }
    response = client.post("/agents/analyze", json=payload)
    assert response.status_code == 200, response.text[:300]
    person = response.json()
    assert person["name"] == payload["name"]
    assert person["linkedin_url"] == payload["linkedin_url"]
    assert person["instagram_url"] == payload["instagram_url"]
    assert person["source_status"] == "analyzed"
    assert person["needs"] and person["hobbies"] and person["interests"] and person["qualities"]

    fetched = client.get(f"/agents/{person['id']}")
    assert fetched.status_code == 200, fetched.text[:300]
    assert fetched.json()["id"] == person["id"]
