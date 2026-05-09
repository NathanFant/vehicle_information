"""
VinAudit Vehicle History API provider.
Single API covering NMVTIS title data, accidents, ownership history, odometer.

Sign up: https://www.vinaudit.com/vehicle-history-api
Pricing: ~$20/mo + $1/report (dealer tier) or pay-per-report
API docs: https://www.vinaudit.com/vin-api-developers-guide

Set in .env:
    VINAUDIT_KEY=your_api_key
    VINAUDIT_USER=your_username
    VINAUDIT_PASS=your_password
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional, Tuple
import httpx

VINAUDIT_KEY = os.getenv("VINAUDIT_KEY")
VINAUDIT_USER = os.getenv("VINAUDIT_USER", "")
VINAUDIT_PASS = os.getenv("VINAUDIT_PASS", "")
BASE = "https://api.vinaudit.com/v2"

STUB_MODE = not VINAUDIT_KEY


async def get_vehicle_history(vin: str) -> Tuple[Dict[str, Any], Optional[str]]:
    """Returns (parsed_history, error_message). Stubs when VINAUDIT_KEY not set."""
    if STUB_MODE:
        return _stub_response(vin), None

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{BASE}/pullreport",
                params={
                    "key": VINAUDIT_KEY,
                    "user": VINAUDIT_USER,
                    "pass": VINAUDIT_PASS,
                    "vin": vin,
                    "format": "json",
                },
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception as e:
        return {"_stub": False, "_error": True}, str(e)

    return _parse_response(vin, raw), None


def _parse_response(vin: str, raw: Dict) -> Dict[str, Any]:
    """Normalize VinAudit response into our internal shape."""
    report = raw.get("report") or raw  # handle both wrapped and flat responses
    title_records = report.get("titleRecords") or report.get("title_records") or []
    accident_records = report.get("accidentRecords") or report.get("accident_records") or []
    junk_salvage = report.get("junkSalvageRecords") or report.get("junk_salvage_records") or []
    odometer_records = report.get("odometerRecords") or report.get("odometer_records") or []
    theft_records = report.get("theftRecords") or report.get("theft_records") or []
    ownership = report.get("ownershipRecords") or report.get("ownership_records") or []

    # Derive title brand from any salvage/junk/flood records
    brands: List[str] = []
    for r in title_records:
        brand = r.get("titleBrand") or r.get("title_brand")
        if brand and brand.lower() not in ("none", "clean", ""):
            brands.append(brand)

    is_salvage = len(junk_salvage) > 0
    is_theft = any(r.get("status", "").lower() in ("stolen", "active") for r in theft_records)

    return {
        "_stub": False,
        "_source": "VinAudit",
        "vin": vin,
        # NMVTIS-equivalent
        "title_brand": brands[0] if brands else "clean",
        "salvage": is_salvage,
        "junk": is_salvage,
        "insurance_total_loss": any(
            "total loss" in str(r).lower() for r in accident_records + title_records
        ),
        "theft_active": is_theft,
        "states_reported": list({r.get("state", "") for r in title_records if r.get("state")}),
        # CARFAX-equivalent events
        "accident_count": len(accident_records),
        "accident_records": [
            {
                "date": r.get("date") or r.get("reportDate"),
                "description": r.get("damageType") or r.get("description") or "Accident record",
                "location": r.get("state"),
            }
            for r in accident_records
        ],
        "service_records": [],  # VinAudit doesn't cover dealer repair records
        "title_events": [
            {
                "date": r.get("issueDate") or r.get("date"),
                "state": r.get("state"),
                "odometer": r.get("odometer"),
                "brand": r.get("titleBrand"),
            }
            for r in title_records
        ],
        # AutoCheck-equivalent
        "odometer_history": [
            {
                "date": r.get("date"),
                "reading": r.get("reading") or r.get("odometer"),
            }
            for r in odometer_records
        ],
        "ownership_history": [
            {
                "date": r.get("date"),
                "state": r.get("state"),
                "odometer": r.get("odometer"),
            }
            for r in ownership
        ],
        "auction_history": [],  # VinAudit may include in ownershipRecords
        # Raw for debugging
        "_raw": report,
    }


def _stub_response(vin: str) -> Dict[str, Any]:
    return {
        "_stub": True,
        "_message": (
            "VinAudit not configured. Set VINAUDIT_KEY + VINAUDIT_USER + VINAUDIT_PASS. "
            "Sign up at https://www.vinaudit.com/vehicle-history-api — ~$1/report at dealer tier."
        ),
        "vin": vin,
        "title_brand": "not_available",
        "salvage": None,
        "junk": None,
        "insurance_total_loss": None,
        "theft_active": None,
        "states_reported": [],
        "accident_count": None,
        "accident_records": [],
        "service_records": [],
        "title_events": [],
        "odometer_history": [],
        "ownership_history": [],
        "auction_history": [],
    }
