"""
NMVTIS (National Motor Vehicle Title Information System) stub.
Title status and salvage/junk branding — legally required disclosure in many states.
Real access requires approved NMVTIS data provider contract.
"""
from __future__ import annotations
import os
from typing import Any, Dict, Optional, Tuple

NMVTIS_API_KEY = os.getenv("NMVTIS_API_KEY")
STUB_MODE = not NMVTIS_API_KEY


async def get_title_status(vin: str) -> Tuple[Dict[str, Any], Optional[str]]:
    if STUB_MODE:
        return _stub_response(vin), None

    import httpx
    nmvtis_base = os.getenv("NMVTIS_API_BASE", "")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{nmvtis_base}/title/{vin}",
                headers={"Authorization": f"Bearer {NMVTIS_API_KEY}"},
            )
            resp.raise_for_status()
            return resp.json(), None
    except Exception as e:
        return {}, str(e)


def _stub_response(vin: str) -> Dict[str, Any]:
    return {
        "_stub": True,
        "_message": "NMVTIS integration pending approved provider contract. Set NMVTIS_API_KEY to enable.",
        "vin": vin,
        "title_brand": "not_available",
        "salvage": None,
        "junk": None,
        "insurance_total_loss": None,
        "states_reported": [],
    }
