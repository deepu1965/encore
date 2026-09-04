from fastapi import FastAPI
from .routers import wallet

app = FastAPI(title="Encore Wallet Service")
app.include_router(wallet.router)
