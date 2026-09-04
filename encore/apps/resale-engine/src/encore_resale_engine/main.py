from fastapi import FastAPI
from .routers import resale

app = FastAPI(title="Encore Resale Engine")
app.include_router(resale.router)
