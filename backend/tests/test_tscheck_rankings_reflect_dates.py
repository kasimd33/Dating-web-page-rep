def _find_row(rankings, other_id):
    for row in rankings:
        if row["candidate"]["id"] == other_id:
            return row
    return None


def test_rankings_reflect_completed_dates_symmetrically(client):
    esther = "seed-12"
    adam = "seed-21"

    esther_rankings = client.get(f"/agents/{esther}/rankings")
    assert esther_rankings.status_code == 200, esther_rankings.text[:300]
    esther_rows = esther_rankings.json()
    # Not a hardcoded global count: assert a sane lower bound (roster is >=25 seeded people)
    # rather than racing other concurrently-running fixtures for an exact total.
    assert len(esther_rows) >= 24, f"expected at least 24 other people, got {len(esther_rows)}"

    adam_row_from_esther = _find_row(esther_rows, adam)
    assert adam_row_from_esther is not None
    assert adam_row_from_esther["date_match"] == 68
    assert adam_row_from_esther["score"] == 68
    assert adam_row_from_esther["date_id"]

    # dated pair should rank at/near the top (date-match rows sort above pure profile-fit rows)
    assert esther_rows[0]["date_match"] is not None

    adam_rankings = client.get(f"/agents/{adam}/rankings")
    assert adam_rankings.status_code == 200, adam_rankings.text[:300]
    adam_rows = adam_rankings.json()
    assert len(adam_rows) >= 24

    esther_row_from_adam = _find_row(adam_rows, esther)
    assert esther_row_from_adam is not None
    assert esther_row_from_adam["date_match"] == 68
    assert esther_row_from_adam["score"] == 68

    # symmetric: same match % from either side
    assert adam_row_from_esther["date_match"] == esther_row_from_adam["date_match"]


def test_rankings_undated_rows_are_profile_fit_only(client):
    response = client.get("/agents/seed-01/rankings")
    assert response.status_code == 200, response.text[:300]
    rows = response.json()
    assert len(rows) >= 24
    undated = [r for r in rows if r["date_match"] is None]
    assert len(undated) > 0
    for row in undated:
        assert row["score"] == row["profile_score"]
        assert row["date_id"] is None
