from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import vin
from .providers import marketcheck

app = FastAPI(
    title="Vehicle History Intelligence API",
    description="Best-attainable vehicle history snapshot from multiple independent sources.",
    version="0.1.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vin.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vehicle-intelligence"}


@app.get("/_debug/mc/{vin}")
async def debug_marketcheck(vin: str):
    data, error = await marketcheck.get_vehicle_history(vin.upper())
    return {"stub": data.get("_stub"), "error": error, "listing_count": data.get("listing_count"), "raw_error": data.get("_error")}
