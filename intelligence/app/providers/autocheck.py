"""
Experian AutoCheck provider stub.
Strong at auction/wholesale data and title transitions.
Real integration requires Experian data partnership.
"""
from __future__ import annotations
import os
from typing import Any, Dict, Optional, Tuple

AUTOCHECK_API_KEY = os.getenv("AUTOCHECK_API_KEY")
AUTOCHECK_BASE = os.getenv("AUTOCHECK_API_BASE", "https://api.autocheck.com/v1")

STUB_MODE = not AUTOCHECK_API_KEY


async def get_vehicle_report(vin: str) -> Tuple[Dict[str, Any], Optional[str]]:
    if STUB_MODE:
        return _stub_response(vin), None

    import httpx
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{AUTOCHECK_BASE}/report/{vin}",
                headers={"X-API-Key": AUTOCHECK_API_KEY},
            )
            resp.raise_for_status()
            return resp.json(), None
    except Exception as e:
        return {}, str(e)


def _stub_response(vin: str) -> Dict[str, Any]:
    return {
        "_stub": True,
        "_message": "AutoCheck integration pending Experian data partnership. Set AUTOCHECK_API_KEY to enable.",
        "vin": vin,
        "autoscore": None,
        "title_history": [],
        "auction_history": [],
        "odometer_history": [],
    }
