"""
MarketCheck Vehicle History API provider.
Returns listing/market history: odometer readings, auction appearances,
dealer-to-dealer movement, price history, and geographic tracking.

Sign up (instant, no approval): https://www.marketcheck.com/thank-you-api/
Free tier: 500 calls/month — enough for development and light production use.
Pricing: https://www.marketcheck.com/apis/pricing/

Set in .env:
    MARKETCHECK_API_KEY=your_api_key
    MARKETCHECK_API_SECRET=your_api_secret

Auth: Both key and secret are sent as query params on every request.
Endpoint: GET https://api.marketcheck.com/v2/history/car/{vin}?api_key=KEY&api_secret=SECRET
Returns: array of listing records (50 per page, paginated)

Coverage vs. other providers:
  ✅ Odometer history (rollback detection)
  ✅ Auction appearances
  ✅ Dealer-to-dealer ownership signals
  ✅ Price history
  ✅ Geographic movement (city/state changes)
  ✅ 45,000+ sources, 5B+ listings since 2015
  ❌ Title brand / salvage (needs NMVTIS separately)
  ❌ Insurance accident reports (needs CARFAX/AutoCheck)
  ❌ Dealer repair logs (inaccessible via any API)
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional, Tuple
import httpx

MARKETCHECK_API_KEY = os.getenv("MARKETCHECK_API_KEY")
MARKETCHECK_API_SECRET = os.getenv("MARKETCHECK_API_SECRET")
BASE = "https://api.marketcheck.com/v2"
FIELDS = "id,price,miles,seller_type,seller_name,city,state,inventory_type,data_source,first_seen_at_date,last_seen_at_date"

STUB_MODE = not MARKETCHECK_API_KEY


async def get_vehicle_history(vin: str) -> Tuple[Dict[str, Any], Optional[str]]:
    """Returns (parsed_history, error_message). Stubs when MARKETCHECK_API_KEY not set."""
    if STUB_MODE:
        return _stub_response(vin), None

    records: List[Dict] = []
    page = 1

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            while True:
                params: Dict[str, Any] = {
                    "api_key": MARKETCHECK_API_KEY,
                    "fields": FIELDS,
                    "page": page,
                    "sort_order": "asc",
                }
                if MARKETCHECK_API_SECRET:
                    params["api_secret"] = MARKETCHECK_API_SECRET

                resp = await client.get(f"{BASE}/history/car/{vin}", params=params)
                if resp.status_code == 401:
                    return {"_stub": False, "_error": True}, "Invalid MarketCheck API key or secret"
                if resp.status_code == 429:
                    break  # rate limited — return what we have
                resp.raise_for_status()
                page_data = resp.json()
                if not page_data:
                    break
                records.extend(page_data)
                if len(page_data) < 50:
                    break  # last page
                page += 1
    except Exception as e:
        return {"_stub": False, "_error": True}, str(e)

    return _parse_records(vin, records), None


def _deduplicate_odo(entries: List[Dict], window_days: int = 7) -> List[Dict]:
    """
    Collapse odometer readings that fall within `window_days` of each other
    into a single entry (keep the one with the most authoritative source name).
    Removes syndication noise where the same reading appears at many dealers
    on the same day.
    """
    from datetime import date as dt, timedelta

    if not entries:
        return []

    def parse_date(d: str) -> Optional[dt]:
        try:
            return dt.fromisoformat(d[:10])
        except (ValueError, TypeError):
            return None

    sorted_entries = sorted(entries, key=lambda e: (e.get("date") or ""))
    result: List[Dict] = []

    for entry in sorted_entries:
        ed = parse_date(entry.get("date", ""))
        if not ed:
            continue
        # Check if this reading is within window_days of the last kept entry
        if result:
            last_d = parse_date(result[-1].get("date", ""))
            if last_d and abs((ed - last_d).days) <= window_days:
                # Keep whichever reading is higher (more conservative — avoids hiding rollback)
                if entry["reading"] > result[-1]["reading"]:
                    result[-1] = entry
                continue
        result.append(entry)

    return result


def _deduplicate_ownership(signals: List[Dict], window_days: int = 30) -> List[Dict]:
    """
    Reduce ownership signals to meaningful transitions: state changes or
    entries separated by more than `window_days`. Removes same-day
    dealer-group syndication entries.
    """
    from datetime import date as dt

    def parse_date(d: str) -> Optional[dt]:
        try:
            return dt.fromisoformat((d or "")[:10])
        except (ValueError, TypeError):
            return None

    sorted_signals = sorted(signals, key=lambda s: (s.get("date") or ""))
    result: List[Dict] = []

    for sig in sorted_signals:
        if not sig.get("date"):
            continue
        if not result:
            result.append(sig)
            continue
        last = result[-1]
        last_d = parse_date(last.get("date", ""))
        curr_d = parse_date(sig.get("date", ""))
        if not last_d or not curr_d:
            result.append(sig)
            continue
        gap = (curr_d - last_d).days
        state_changed = sig.get("state") != last.get("state")
        seller_type_changed = sig.get("seller_type") != last.get("seller_type")
        if gap > window_days or state_changed or seller_type_changed:
            result.append(sig)

    return result


def _parse_records(vin: str, records: List[Dict]) -> Dict[str, Any]:
    """
    Derive structured history signals from MarketCheck listing records.
    Each record = one time this VIN appeared for sale somewhere.
    """
    if not records:
        return {
            "_stub": False,
            "_source": "MarketCheck",
            "_empty": True,
            "vin": vin,
            "listing_count": 0,
            "odometer_history": [],
            "auction_history": [],
            "ownership_signals": [],
            "price_history": [],
            "states_seen": [],
            "odometer_rollback_detected": False,
            "rollback_detail": None,
            "accident_records": [],
            "service_records": [],
            "title_events": [],
            "ownership_history": [],
            "accident_count": 0,
            "title_brand": "not_available",
            "salvage": None,
        }

    raw_odo: List[Dict] = []
    auction_history: List[Dict] = []
    ownership_signals: List[Dict] = []
    price_history: List[Dict] = []
    states: List[str] = []

    for r in records:
        date = r.get("first_seen_at_date") or r.get("last_seen_at_date")
        miles = r.get("miles")
        price = r.get("price")
        seller_type = r.get("seller_type", "unknown")
        city = r.get("city", "")
        state = r.get("state", "")
        seller_name = r.get("seller_name", "Unknown")
        location = f"{city}, {state}".strip(", ")

        if miles:
            raw_odo.append({"date": date, "reading": miles, "source": seller_name, "location": location})

        if seller_type in ("auction", "wholesale"):
            auction_history.append({"date": date, "location": location, "price": price, "miles": miles, "seller": seller_name})

        ownership_signals.append({
            "date": date,
            "seller_type": seller_type,
            "state": state,
            "odometer": miles,
        })

        if price:
            price_history.append({"date": date, "price": price, "seller": seller_name})

        if state:
            states.append(state)

    # Deduplicate odometer readings: collapse readings within 7 days of each other
    # into a single entry (keeps the first seen). This removes dealer-network
    # syndication noise where the same listing appears at 10+ stores simultaneously.
    odometer_history = _deduplicate_odo(raw_odo, window_days=7)

    # Rollback detection: require decrease of >500 miles across a gap of >30 days.
    # Small differences within a short window are syndication/data noise, not fraud.
    rollback_detected = False
    rollback_detail = None
    sorted_odo = sorted(
        [(e["date"][:10], e["reading"]) for e in odometer_history if e.get("date") and e.get("reading")],
        key=lambda x: x[0],
    )
    for i in range(1, len(sorted_odo)):
        prev_date, prev_miles = sorted_odo[i - 1]
        curr_date, curr_miles = sorted_odo[i]
        from datetime import date as dt
        try:
            gap_days = (dt.fromisoformat(curr_date) - dt.fromisoformat(prev_date)).days
        except ValueError:
            gap_days = 999
        drop = prev_miles - curr_miles
        if drop > 500 and gap_days > 30:
            rollback_detected = True
            rollback_detail = (
                f"Mileage dropped from {prev_miles:,} mi ({prev_date}) "
                f"to {curr_miles:,} mi ({curr_date}) — {drop:,} mile decrease over {gap_days} days."
            )
            break

    # Deduplicate ownership signals to one entry per state-transition or 30-day window
    deduped_ownership = _deduplicate_ownership(ownership_signals)

    return {
        "_stub": False,
        "_source": "MarketCheck",
        "vin": vin,
        "listing_count": len(records),
        "odometer_history": odometer_history,
        "auction_history": auction_history,
        "ownership_signals": deduped_ownership,
        "price_history": price_history,
        "states_seen": list(dict.fromkeys(states)),
        "odometer_rollback_detected": rollback_detected,
        "rollback_detail": rollback_detail,
        # Shape-compatible fields for synthesis layer
        "accident_records": [],
        "service_records": [],
        "title_events": [],
        "ownership_history": [
            {"date": s["date"], "state": s["state"], "odometer": s["odometer"]}
            for s in deduped_ownership
        ],
        "accident_count": 0,
        "title_brand": "not_available",
        "salvage": None,
    }


def _stub_response(vin: str) -> Dict[str, Any]:
    return {
        "_stub": True,
        "_message": (
            "MarketCheck not configured. Set MARKETCHECK_API_KEY and MARKETCHECK_API_SECRET. "
            "Instant self-serve signup (free tier 500 calls/month): "
            "https://www.marketcheck.com/thank-you-api/"
        ),
        "vin": vin,
        "listing_count": 0,
        "odometer_history": [],
        "auction_history": [],
        "ownership_signals": [],
        "price_history": [],
        "states_seen": [],
        "odometer_rollback_detected": False,
        "rollback_detail": None,
        "accident_records": [],
        "service_records": [],
        "title_events": [],
        "ownership_history": [],
        "accident_count": 0,
        "title_brand": "not_available",
        "salvage": None,
    }
