import sys
import os
from pathlib import Path

# Add the src dir to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "src"))

from redis import Redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from encore_gateway.db import get_engine
from encore_gateway.models import Event

def main():
    engine = get_engine()
    redis = Redis(host="localhost", port=6380) # docker compose redis port is 6380 on host
    
    with Session(engine) as session:
        events = session.execute(select(Event)).scalars().all()
        for event in events:
            # We add all prefixes of the title to a zset
            name = event.name.lower().strip()
            # Since we are using ZRANGEBYLEX, we can also just add the full term 
            # and prefix matches will naturally find it because "tay" < "taylor swift" < "tay\xff"
            # So we only need to insert the FULL terms!
            redis.zadd("autocomplete:events", {name: 0})
    print("Autocomplete backfill complete!")

if __name__ == "__main__":
    main()
