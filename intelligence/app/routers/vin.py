from __future__ import annotations
import asyncio
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models.vehicle import VehicleReport
from ..providers import nhtsa, carfax, autocheck, nmvtis, marketcheck
from ..services.synthesis import synthesize

router = APIRouter(prefix="/vin", tags=["vin"])

VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$", re.IGNORECASE)


class OBDInput(BaseModel):
    fault_codes: list[str] = []
    odometer: Optional[int] = None
    readiness_ok: Optional[bool] = None
    battery_voltage: Optional[float] = None


async def _gather_providers(vin: str):
    return await asyncio.gather(
        nhtsa.decode_vin(vin),
        marketcheck.get_vehicle_history(vin),
        carfax.get_vehicle_history(vin),
        autocheck.get_vehicle_report(vin),
        nmvtis.get_title_status(vin),
    )


@router.get("/{vin}", response_model=VehicleReport)
async def lookup_vin(vin: str):
    vin = vin.upper().strip()
    if not VIN_RE.match(vin):
        raise HTTPException(status_code=422, detail="Invalid VIN format (must be 17 alphanumeric chars, no I/O/Q)")

    (nhtsa_data, nhtsa_err), (mc_data, mc_err), (cfx_data, _), (ac_data, _), (nmv_data, _) = \
        await _gather_providers(vin)

    make = nhtsa_data.get("make") or ""
    model = nhtsa_data.get("model") or ""
    year = nhtsa_data.get("year") or ""

    raw_recalls: list = []
    recalls_err: Optional[str] = None
    if make and model and year:
        raw_recalls, recalls_err = await nhtsa.get_recalls(make, model, year)

    report = await synthesize(
        vin=vin,
        nhtsa_decode=nhtsa_data,
        nhtsa_error=nhtsa_err,
        raw_recalls=raw_recalls,
        recalls_error=recalls_err,
        marketcheck_data=mc_data,
        carfax_data=cfx_data,
        autocheck_data=ac_data,
        nmvtis_data=nmv_data,
    )
    return report


@router.post("/{vin}/obd", response_model=VehicleReport)
async def lookup_vin_with_obd(vin: str, obd: OBDInput):
    vin = vin.upper().strip()
    if not VIN_RE.match(vin):
        raise HTTPException(status_code=422, detail="Invalid VIN format")

    (nhtsa_data, nhtsa_err), (mc_data, mc_err), (cfx_data, _), (ac_data, _), (nmv_data, _) = \
        await _gather_providers(vin)

    make = nhtsa_data.get("make") or ""
    model = nhtsa_data.get("model") or ""
    year = nhtsa_data.get("year") or ""

    raw_recalls: list = []
    recalls_err = None
    if make and model and year:
        raw_recalls, recalls_err = await nhtsa.get_recalls(make, model, year)

    obd_dict = {
        "fault_codes": obd.fault_codes,
        "odometer": obd.odometer,
        "readiness_ok": obd.readiness_ok,
        "battery_voltage": obd.battery_voltage,
        "_stub": len(obd.fault_codes) == 0 and obd.odometer is None,
    }

    report = await synthesize(
        vin=vin,
        nhtsa_decode=nhtsa_data,
        nhtsa_error=nhtsa_err,
        raw_recalls=raw_recalls,
        recalls_error=recalls_err,
        marketcheck_data=mc_data,
        carfax_data=cfx_data,
        autocheck_data=ac_data,
        nmvtis_data=nmv_data,
        obd_data=obd_dict,
    )
    return report
