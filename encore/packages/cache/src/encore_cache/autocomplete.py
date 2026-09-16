"""Redis-backed autocomplete using sorted sets and ZRANGEBYLEX.

On event publish: for each prefix of event name, ZADD autocomplete:events score=0 member="{prefix}:{event_id}:{event_name}"
On query: ZRANGEBYLEX autocomplete:events "[{q}" "[{q}\xff" LIMIT 0 10
"""  # noqa: E501

from redis import Redis


def add_to_autocomplete(redis_client: Redis, event_id: str, event_name: str) -> None:
    """Add event name prefixes to the autocomplete sorted set."""
    if not event_name:
        return
        
    pipeline = redis_client.pipeline()
    
    # Generate all prefixes
    name_lower = event_name.lower().strip()
    for i in range(1, len(name_lower) + 1):
        prefix = name_lower[:i]
        member = f"{prefix}:{event_id}:{event_name}"
        # ZADD with score 0
        pipeline.zadd("autocomplete:events", {member: 0})
        
    pipeline.execute()
