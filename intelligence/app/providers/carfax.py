"""
CARFAX provider stub.
Real integration requires business approval and signed API agreement.
Stub returns realistic structure so the synthesis layer can work end-to-end.
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional, Tuple

CARFAX_API_KEY = os.getenv("CARFAX_API_KEY")
CARFAX_BASE = os.getenv("CARFAX_API_BASE", "https://api.carfax.com/v1")

STUB_MODE = not CARFAX_API_KEY


async def get_vehicle_history(vin: str) -> Tuple[Dict[str, Any], Optional[str]]:
    """Returns (history_data, error). Stub when CARFAX_API_KEY not set."""
    if STUB_MODE:
        return _stub_response(vin), None

    # Production path — implement once API agreement is in place
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{CARFAX_BASE}/history/{vin}",
                headers={"Authorization": f"Bearer {CARFAX_API_KEY}"},
            )
            resp.raise_for_status()
            return resp.json(), None
    except Exception as e:
        return {}, str(e)


def _stub_response(vin: str) -> Dict[str, Any]:
    return {
        "_stub": True,
        "_message": "CARFAX integration pending API agreement. Set CARFAX_API_KEY to enable.",
        "vin": vin,
        "owner_count": None,
        "accident_count": None,
        "service_records": [],
        "title_events": [],
        "ownership_history": [],
    }
