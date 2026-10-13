from datetime import datetime, timezone


AVATARS = [
    "https://images.unsplash.com/photo-1685903772095-f07172808761?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1641288883869-c463bc6c2a58?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?auto=format&fit=crop&w=240&q=80",
    "https://images.unsplash.com/photo-1569913486515-b74bf7751574?auto=format&fit=crop&w=240&q=80",
]

PEOPLE = [
    ("Arianna Huffington", "Founder · Thrive Global", "New York, NY", ["curiosity", "a calm home base", "purpose"], ["wellness", "long walks", "reading"], ["future of work", "mindfulness", "storytelling"]),
    ("Satya Nadella", "CEO · Microsoft", "Seattle, WA", ["empathy", "intellectual play", "a grounded partner"], ["cricket", "poetry", "family dinners"], ["technology", "leadership", "accessible design"]),
    ("Serena Williams", "Investor · Serena Ventures", "Miami, FL", ["ambition", "loyalty", "joy"], ["fashion", "tennis", "travel"], ["founders", "culture", "women in business"]),
    ("Emma Watson", "Actor · Goodwill Ambassador", "London, UK", ["thoughtfulness", "a curious mind", "privacy"], ["books", "hiking", "slow mornings"], ["sustainability", "education", "film"]),
    ("Trevor Noah", "Comedian · Author", "New York, NY", ["laughter", "honesty", "adventure"], ["music", "food", "language"], ["global culture", "comedy", "politics"]),
    ("Issa Rae", "Writer · Producer", "Los Angeles, CA", ["creative spark", "community", "realness"], ["film", "fashion", "good food"], ["storytelling", "entrepreneurship", "music"]),
    ("Jimmy Donaldson", "Creator · Beast Industries", "Greenville, NC", ["big-hearted energy", "play", "reliability"], ["games", "giving back", "experiments"], ["creator economy", "philanthropy", "scale"]),
    ("Tim Cook", "CEO · Apple", "Cupertino, CA", ["integrity", "quiet confidence", "movement"], ["cycling", "photography", "coffee"], ["privacy", "design", "fitness"]),
    ("Mel Robbins", "Author · Speaker", "Boston, MA", ["direct communication", "growth", "warmth"], ["podcasts", "travel", "behavior science"], ["habits", "confidence", "human potential"]),
    ("Sophia Amoruso", "Founder · Business Author", "Los Angeles, CA", ["independence", "creative risk", "wit"], ["vintage", "art", "road trips"], ["startups", "fashion", "reinvention"]),
    ("Mark Manson", "Author · Blogger", "Austin, TX", ["self-awareness", "humor", "directness"], ["travel", "writing", "guitar"], ["psychology", "relationships", "philosophy"]),
    ("Esther Perel", "Psychotherapist · Author", "New York, NY", ["depth", "playfulness", "presence"], ["theater", "food", "conversation"], ["relationships", "culture", "desire"]),
    ("Ali Abdaal", "Doctor · Creator", "Cambridge, UK", ["optimism", "kindness", "curiosity"], ["piano", "reading", "coffee shops"], ["productivity", "learning", "creator tools"]),
    ("Marie Forleo", "Entrepreneur · Author", "New York, NY", ["positive momentum", "heart", "resourcefulness"], ["dance", "business", "comedy"], ["creative careers", "marketing", "mindset"]),
    ("Naval Ravikant", "Founder · Investor", "San Francisco, CA", ["freedom", "stillness", "clear thinking"], ["meditation", "reading", "technology"], ["startups", "wealth", "philosophy"]),
    ("Alexis Ohanian", "Founder · Investor", "New York, NY", ["teamwork", "family", "play"], ["sports", "gaming", "internet culture"], ["startups", "parents", "sports"]),
    ("Jessica Alba", "Founder · Honest Company", "Los Angeles, CA", ["family time", "trust", "purpose"], ["design", "fitness", "cooking"], ["consumer brands", "wellness", "sustainability"]),
    ("Gary Vaynerchuk", "Founder · VaynerX", "New York, NY", ["drive", "candor", "big energy"], ["sports", "wine", "collectibles"], ["marketing", "culture", "business"]),
    ("Reshma Saujani", "Founder · Girls Who Code", "New York, NY", ["bravery", "impact", "intention"], ["advocacy", "family", "politics"], ["education", "technology", "women"]),
    ("Bozoma Saint John", "Brand Executive", "Los Angeles, CA", ["style", "honesty", "boldness"], ["music", "fashion", "travel"], ["brand", "culture", "leadership"]),
    ("Adam Grant", "Organizational Psychologist", "Philadelphia, PA", ["generosity", "debate", "wonder"], ["writing", "sports", "podcasts"], ["workplace", "motivation", "psychology"]),
    ("Leila Hormozi", "Operator · Entrepreneur", "Las Vegas, NV", ["discipline", "ambition", "directness"], ["lifting", "business", "systems"], ["operations", "growth", "leadership"]),
    ("Nuseir Yassin", "Creator · Nas Daily", "Singapore", ["adventure", "optimism", "momentum"], ["travel", "video", "languages"], ["media", "culture", "storytelling"]),
    ("Rupi Kaur", "Poet · Artist", "Toronto, CA", ["emotional honesty", "softness", "space"], ["poetry", "nature", "art"], ["healing", "writing", "identity"]),
    ("David Chang", "Chef · Entrepreneur", "New York, NY", ["humor", "honesty", "a great meal"], ["cooking", "music", "travel"], ["food", "hospitality", "culture"]),
]


def seeded_candidates() -> list[dict]:
    created_at = datetime.now(timezone.utc)
    records = []
    for index, (name, role, location, needs, hobbies, interests) in enumerate(PEOPLE):
        handle = name.lower().replace(" ", "").replace("·", "")
        records.append(
            {
                "id": f"seed-{index + 1:02d}",
                "name": name,
                "role": role,
                "location": location,
                "linkedin_url": f"https://www.linkedin.com/in/{handle}",
                "instagram_url": f"https://www.instagram.com/{handle}/",
                "avatar_url": AVATARS[index % len(AVATARS)],
                "needs": needs,
                "hobbies": hobbies,
                "interests": interests,
                "qualities": ["self-directed", "warm", "high agency"] if index % 2 == 0 else ["thoughtful", "playful", "resilient"],
                "agent_style": "The thoughtful connector" if index % 3 == 0 else "The curious wildcard" if index % 3 == 1 else "The grounded optimist",
                "source_status": "curated",
                "created_at": created_at,
            }
        )
    return records