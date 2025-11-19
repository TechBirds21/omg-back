from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field

# Define valid setting keys
SettingKey = Literal[
    "hero_section",
    "contact_info",
    "shipping_policy",
    "brand",
    "seo",
    "footer",
    "about",
]


class SettingResponse(BaseModel):
    key: str
    value: Any


class SettingsResponse(BaseModel):
    settings: Dict[str, Any]


class SettingPatch(BaseModel):
    value: Any


class PaymentConfigOut(BaseModel):
    payment_method: str
    is_enabled: bool = False
    is_primary: bool = False
    display_name: str
    description: Optional[str] = None
    configuration: Dict[str, Any] = Field(default_factory=dict)
    encrypted_keys: Dict[str, Any] = Field(default_factory=dict)


class PaymentConfigCreate(BaseModel):
    payment_method: str
    display_name: str
    description: Optional[str] = None
    configuration: Dict[str, Any] = Field(default_factory=dict)
    is_enabled: bool = False
    is_primary: bool = False


class PaymentConfigUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None
    is_primary: Optional[bool] = None


class PaymentConfigToggleRequest(BaseModel):
    is_enabled: bool


