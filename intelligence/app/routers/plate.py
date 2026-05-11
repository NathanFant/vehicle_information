from __future__ import annotations
import os
import re
from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/plate", tags=["plate"])

MARKETCHECK_API_KEY = os.getenv("MARKETCHECK_API_KEY")
MARKETCHECK_API_SECRET = os.getenv("MARKETCHECK_API_SECRET")
BASE = "https://api.marketcheck.com/v2"

PLATE_RE = re.compile(r"^[A-Z0-9 \-]{1,10}$")
STATE_RE = re.compile(r"^[A-Z]{2}$")


@router.get("/{state}/{plate}")
async def plate_to_vin(state: str, plate: str):
    state = state.upper().strip()
    plate = plate.upper().strip()

    if not STATE_RE.match(state):
        raise HTTPException(status_code=422, detail="Invalid state code.")
    if not PLATE_RE.match(plate):
        raise HTTPException(status_code=422, detail="Invalid plate format.")

    if not MARKETCHECK_API_KEY:
        raise HTTPException(status_code=503, detail="Plate lookup is not configured on this server.")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{BASE}/decode/car/{plate}/state/{state}",
                params={
                    "api_key": MARKETCHECK_API_KEY,
                    "api_secret": MARKETCHECK_API_SECRET,
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Upstream request failed: {exc}")

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"No VIN found for plate {plate} in {state}.")
    if resp.status_code == 401:
        raise HTTPException(status_code=502, detail="Plate lookup API key invalid.")
    if not resp.is_success:
        raise HTTPException(status_code=502, detail=f"Upstream error {resp.status_code}.")

    data = resp.json()
    vin = data.get("vin") or (data.get("listings") or [{}])[0].get("vin")
    if not vin:
        raise HTTPException(status_code=404, detail=f"No VIN found for plate {plate} in {state}.")

    return {"vin": vin.upper(), "state": state, "plate": plate}
