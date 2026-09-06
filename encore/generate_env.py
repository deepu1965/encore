import os
from encore_gateway.db import SessionWrite, shard_manager
from encore_gateway.models import Event, User, Seat

def generate():
    db = SessionWrite()
    try:
        user = db.query(User).first()
        event = db.query(Event).first()
    finally:
        db.close()
    
    shard_db = shard_manager.get_session(event.id)
    try:
        seats = shard_db.query(Seat).all()
        seat_ids = [str(s.id) for s in seats]
    finally:
        shard_db.close()
        
    print(f"TEST_USER_TOKEN={user.id}")
    print(f"CONTENTION_EVENT_ID={event.id}")
    print(f"CONTENTION_SEAT_ID={seat_ids[1]}")
    print(f"FLASH_SALE_EVENT_ID={event.id}")
    print(f"FLASH_SALE_SEAT_IDS={','.join(seat_ids[2:7])}")

if __name__ == "__main__":
    generate()
