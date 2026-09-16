import math
import uuid

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from encore_location.db import get_db
from encore_location.models import Event, UserFollow, Venue
from encore_location.redis_client import get_redis

app = FastAPI(title="Encore Location Service")

@app.get("/health")
def health():
    return {"status": "ok"}

class Coordinate(BaseModel):
    lat: float
    lon: float

class EventDistanceResponse(BaseModel):
    event_id: uuid.UUID
    name: str
    venue_name: str
    distance_meters: float

class LocationUpdateRequest(BaseModel):
    lat: float
    lon: float
    opt_in: bool

class RouteResponse(BaseModel):
    distance_km: float
    eta_minutes: int
    polyline: str

@app.get("/events-near-me", response_model=list[EventDistanceResponse])
def get_events_near_me(lat: float, lon: float, radius_km: float = 10.0, db: Session = Depends(get_db)):  # noqa: E501
    # PostGIS ST_DWithin uses meters for Geography or SRID 4326 geometry (wait, if geometry SRID 4326, ST_DWithin is in degrees or meters depending on cast to geography)  # noqa: E501
    # Cast to geography for meters calculation
    from sqlalchemy import func
    user_pt = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    radius_meters = radius_km * 1000

    query = select(
        Event.id,
        Event.name,
        Venue.name.label("venue_name"),
        func.ST_Distance(func.cast(Venue.location, func.geography()), func.cast(user_pt, func.geography())).label("distance")  # noqa: E501
    ).join(Venue).where(
        func.ST_DWithin(func.cast(Venue.location, func.geography()), func.cast(user_pt, func.geography()), radius_meters)  # noqa: E501
    ).order_by("distance")

    results = db.execute(query).all()
    return [
        EventDistanceResponse(
            event_id=row.id,
            name=row.name,
            venue_name=row.venue_name,
            distance_meters=row.distance
        ) for row in results
    ]

@app.post("/friends/location")
def update_friend_location(
    req: LocationUpdateRequest, 
    x_user_id: uuid.UUID = Header(...),
    redis = Depends(get_redis)
):
    if not req.opt_in:
        # If not opted in, remove them from the spatial index
        redis.zrem("user_locations", str(x_user_id))
        return {"status": "opted_out"}
    
    # Store in Redis with GEOADD
    redis.geoadd("user_locations", (req.lon, req.lat, str(x_user_id)))
    # Redis GEO items don't have individual TTLs natively. 
    # To implement 60s TTL, we can store a separate key with EXPIRE and check it, or use a background cleanup job.  # noqa: E501
    # For V1: store a sentinel key that expires, and only consider friends active if their sentinel exists.  # noqa: E501
    redis.setex(f"user_loc_ttl:{x_user_id}", 60, "1")
    return {"status": "updated"}

@app.get("/friends/nearby")
def get_nearby_friends(
    lat: float, lon: float, radius_km: float = 10.0,
    x_user_id: uuid.UUID = Header(...),
    db: Session = Depends(get_db),
    redis = Depends(get_redis)
):
    # Get all friends/follows where mutual (or just followed users). 
    # For simplicity in V1, let's treat people you follow as "friends" for location purposes if they opted in.  # noqa: E501
    followed = db.execute(select(UserFollow.organizer_id).where(UserFollow.follower_id == x_user_id)).scalars().all()  # noqa: E501
    if not followed:
        return []

    # GEORADIUS is deprecated in Redis 6.2+, using GEOSEARCH
    # GEOSEARCH user_locations FROMLONLAT lon lat BYRADIUS radius_km km
    nearby_users = redis.geosearch(
        "user_locations",
        longitude=lon,
        latitude=lat,
        radius=radius_km,
        unit="km",
        withdist=True
    )

    result = []
    for user_str, dist in nearby_users:
        uid = uuid.UUID(user_str)
        if uid in followed and uid != x_user_id:
            # Check TTL sentinel
            if redis.exists(f"user_loc_ttl:{uid}"):
                result.append({"user_id": uid, "distance_km": dist})
            else:
                # Cleanup stale entry
                redis.zrem("user_locations", user_str)

    return result

@app.get("/routing/eta", response_model=RouteResponse)
def get_routing_eta(lat: float, lon: float, venue_id: uuid.UUID, db: Session = Depends(get_db)):
    # Mock RoutingProvider
    venue = db.execute(select(Venue).where(Venue.id == venue_id)).scalar_one_or_none()
    if not venue or not venue.location:
        raise HTTPException(status_code=404, detail="Venue location not found")
    
    # Retrieve lat/lon from venue location using PostGIS func
    from sqlalchemy import func
    v_lon = db.execute(select(func.ST_X(venue.location))).scalar()
    v_lat = db.execute(select(func.ST_Y(venue.location))).scalar()

    # Calculate straight-line distance in km (Haversine approx for mock)
    R = 6371.0
    dlat = math.radians(v_lat - lat)
    dlon = math.radians(v_lon - lon)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(v_lat)) * math.sin(dlon / 2)**2  # noqa: E501
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_km = R * c

    # Mock ETA: 30 km/h average speed
    eta_minutes = int((distance_km / 30.0) * 60)

    return RouteResponse(
        distance_km=round(distance_km, 2),
        eta_minutes=eta_minutes,
        polyline="mock_polyline_xyz"
    )
