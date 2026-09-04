from fastapi import APIRouter
from ..schemas import ListingCreate, OrderCreate

router = APIRouter(prefix="/api/v1/resale", tags=["resale"])

@router.post("/listings", status_code=201)
def create_listing(payload: ListingCreate):
    return {"status": "success"}

@router.post("/orders", status_code=201)
def create_order(payload: OrderCreate):
    return {"status": "success"}
