from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, status

from ...services.admin_settings import admin_settings_service
from ...services.admin_settings_models import (
    PaymentConfigCreate,
    PaymentConfigOut,
    PaymentConfigToggleRequest,
    PaymentConfigUpdate,
    SettingKey,
    SettingPatch,
    SettingResponse,
    SettingsResponse,
)

router = APIRouter()


@router.get("/", response_model=SettingsResponse)
async def get_all_settings() -> SettingsResponse:
    return await admin_settings_service.get_all_settings()


# Payment config routes must come BEFORE /{key} route to avoid path conflicts
@router.get("/payment-config", response_model=List[PaymentConfigOut])
async def list_payment_configs() -> List[PaymentConfigOut]:
    return await admin_settings_service.list_payment_configs()


@router.post("/payment-config", response_model=PaymentConfigOut, status_code=status.HTTP_201_CREATED)
async def create_payment_config(payload: PaymentConfigCreate) -> PaymentConfigOut:
    return await admin_settings_service.create_payment_config(payload)


@router.put("/payment-config/{payment_method}", response_model=PaymentConfigOut)
async def update_payment_config(payment_method: str, payload: PaymentConfigUpdate) -> PaymentConfigOut:
    updated = await admin_settings_service.update_payment_config(payment_method, payload)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment config not found")
    return updated


@router.post("/payment-config/{payment_method}/toggle", response_model=PaymentConfigOut)
async def toggle_payment_method(payment_method: str, payload: PaymentConfigToggleRequest) -> PaymentConfigOut:
    updated = await admin_settings_service.toggle_payment_method(payment_method, payload.is_enabled)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment config not found")
    return updated


@router.post("/payment-config/{payment_method}/primary", response_model=PaymentConfigOut)
async def set_primary_payment_method(payment_method: str) -> PaymentConfigOut:
    updated = await admin_settings_service.set_primary_payment_method(payment_method)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment config not found")
    return updated


@router.get("/{key}", response_model=SettingResponse)
async def get_setting(key: SettingKey) -> SettingResponse:
    value = await admin_settings_service.get_setting(key)
    if value is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    return SettingResponse(key=key, value=value)


@router.patch("/{key}", response_model=SettingResponse)
async def update_setting(key: SettingKey, payload: SettingPatch) -> SettingResponse:
    updated = await admin_settings_service.update_setting(key, payload.value)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")
    return SettingResponse(key=key, value=updated)

