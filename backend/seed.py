import asyncio

from lib.db import client, db, ensure_indexes
from lib.seed_data import seeded_candidates


async def main() -> None:
    await ensure_indexes()
    if await db.candidates.count_documents({}) == 0:
        await db.candidates.insert_many(seeded_candidates())
    print(f"AgentCupid candidates: {await db.candidates.count_documents({})}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())