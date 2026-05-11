from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import vin, plate

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
app.include_router(plate.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vehicle-intelligence"}
