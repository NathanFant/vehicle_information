"""
NHTSA public API provider — VIN decode + recalls.
Free, no auth required. Rate limits are generous for single-user apps.
"""
from __future__ import annotations
import httpx
from typing import Any, Dict, List, Optional, Tuple

VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"
RECALLS_BASE = "https://api.nhtsa.gov/recalls"


def _find(results: List[Dict], variable: str) -> Optional[str]:
    for r in results:
        if r.get("Variable") == variable:
            v = r.get("Value")
            return v if v and v != "Not Applicable" else None
    return None


async def decode_vin(vin: str) -> Tuple[Dict[str, Any], Optional[str]]:
    """Returns (parsed_fields, error_message)."""
    url = f"{VPIC_BASE}/DecodeVin/{vin}?format=json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        return {}, str(e)

    results = data.get("Results", [])
    return {
        "year": _find(results, "Model Year"),
        "make": _find(results, "Make"),
        "model": _find(results, "Model"),
        "trim": _find(results, "Trim"),
        "body_style": _find(results, "Body Class"),
        "engine": _find(results, "Displacement (L)"),
        "engine_cylinders": _find(results, "Engine Number of Cylinders"),
        "transmission": _find(results, "Transmission Style"),
        "drive_type": _find(results, "Drive Type"),
        "fuel_type": _find(results, "Fuel Type - Primary"),
        "plant_country": _find(results, "Plant Country"),
        "plant_city": _find(results, "Plant City"),
        "error_code": _find(results, "Error Code"),
        "error_text": _find(results, "Error Text"),
        "raw_results": results,
    }, None


async def get_recalls(make: str, model: str, year: str) -> Tuple[List[Dict], Optional[str]]:
    """Fetch recall campaigns for a make/model/year."""
    url = f"{RECALLS_BASE}/recallsByVehicle"
    params = {"make": make, "model": model, "modelYear": year}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        return [], str(e)

    return data.get("results", []), None
