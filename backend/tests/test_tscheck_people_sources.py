import uuid


def test_seeded_people_have_two_sources(client):
    response = client.get("/agents")
    assert response.status_code == 200, response.text[:300]
    people = response.json()
    assert len(people) >= 25
    for person in people[:25]:
        assert person["linkedin_url"].startswith("http")
        assert person["instagram_url"].startswith("http")
        assert person["source_status"] in {"curated", "analyzed"}
