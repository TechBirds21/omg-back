from typing import Any, Dict, List, Optional

from .admin_settings_models import (
    PaymentConfigCreate,
    PaymentConfigOut,
    PaymentConfigToggleRequest,
    PaymentConfigUpdate,
    SettingKey,
)
from .db_service import db_service


class AdminSettingsService:
    def __init__(self) -> None:
        # Default settings (fallback if database not available)
        self._default_settings: Dict[str, Any] = {
            "hero_section": {
                "title": "O Maguva",
                "subtitle": "సాంప్రదాయం మరియు సంప్రదాయం",
                "heading": "Timeless Elegance",
                "description": "Discover the finest collection of handcrafted sarees that blend traditional artistry with contemporary grace.",
                "images": [
                    "https://images.unsplash.com/photo-1530018607912-eff2daa1bacb?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1545505309-05057ef06a62?auto=format&fit=crop&w=900&q=80",
                ],
                "cta_primary_text": "Explore Collections",
                "cta_secondary_text": "Our Story",
            },
            "contact_info": {
                "phone": "+91 98765 43210",
                "email": "support@omaguva.com",
                "address": "12, Heritage Lane, Banjara Hills, Hyderabad - 500034",
                "whatsapp": "+91 90000 00000",
            },
            "shipping_policy": {
                "standard_delivery_days": 5,
                "express_delivery_days": 2,
                "free_shipping_threshold": 1499,
                "return_policy_text": "We offer a 7-day return policy on select products. Contact support for more details.",
            },
            "brand": {
                "name": "O Maguva",
                "logo_url": None,
            },
            "seo": {
                "site_title": "O Maguva - Traditional Sarees",
                "meta_description": "Discover the finest collection of handcrafted sarees",
                "default_image": None,
            },
            "footer": {
                "copyright_text": "© 2024 O Maguva. All rights reserved.",
            },
            "about": {
                "hero_title": "Our Story",
                "hero_subtitle": "O Maguva is born from a passion for preserving the timeless art of saree weaving while bringing it to the modern world.",
                "story_title": "Weaving Dreams into Reality",
                "story_content": "Founded with the vision to bridge the gap between traditional craftsmanship and contemporary fashion, O Maguva represents the perfect harmony of heritage and modernity.",
                "mission_title": "Our Mission",
                "mission_content": "To make authentic, high-quality sarees accessible to women worldwide while supporting traditional artisans.",
                "story_image": "",
                "values": [
                    {"title": "Passion", "description": "Every saree is crafted with love and dedication.", "icon": "Heart"},
                    {"title": "Quality", "description": "We never compromise on quality.", "icon": "Award"},
                    {"title": "Authenticity", "description": "All our products are 100% authentic.", "icon": "Shield"},
                    {"title": "Community", "description": "We support local artisans.", "icon": "Users"}
                ],
                "stats": [
                    {"number": "500+", "label": "Unique Designs"},
                    {"number": "50+", "label": "Partner Artisans"},
                    {"number": "10,000+", "label": "Happy Customers"}
                ],
                "cta_title": "Experience the O Maguva Difference",
                "cta_subtitle": "Discover our exquisite collection and become part of our story",
                "cta_button_text": "Shop Our Collections"
            },
        }

        self._payment_configs: Dict[str, PaymentConfigOut] = {
            "phonepe": PaymentConfigOut(
                payment_method="phonepe",
                is_enabled=True,
                is_primary=True,
                display_name="PhonePe",
                description="UPI, Cards, NetBanking via PhonePe",
                configuration={
                    "supported_methods": ["upi", "cards", "netbanking"],
                    "environment": "sandbox",
                },
            ),
            "easebuzz": PaymentConfigOut(
                payment_method="easebuzz",
                is_enabled=False,
                is_primary=False,
                display_name="Easebuzz",
                description="Easebuzz payment gateway with multiple options",
                configuration={"supported_methods": ["cards", "netbanking"]},
            ),
            "zohopay": PaymentConfigOut(
                payment_method="zohopay",
                is_enabled=False,
                is_primary=False,
                display_name="Zoho Pay",
                description="Zoho Pay UPI/Cards/NetBanking",
                configuration={
                    "supported_methods": ["upi", "cards", "netbanking"],
                    "environment": "sandbox",
                },
            ),
        }

    def _get_settings_from_db(self) -> Dict[str, Any]:
        """Load settings from database if available, otherwise return defaults."""
        if db_service.is_available():
            db_settings = db_service.get_settings()
            if db_settings:
                # Merge with defaults to ensure all keys exist
                merged = self._default_settings.copy()
                merged.update(db_settings)
                return merged
        return self._default_settings.copy()

    async def get_all_settings(self) -> Dict[str, Any]:
        settings = self._get_settings_from_db()
        return {"settings": settings}

    async def get_setting(self, key: SettingKey) -> Optional[Any]:
        settings = self._get_settings_from_db()
        return settings.get(key)

    async def update_setting(self, key: SettingKey, value: Any) -> Optional[Any]:
        # For now, just return the value (actual database update would be implemented here)
        # This is a placeholder - in production, you'd want to save to database
        settings = self._get_settings_from_db()
        if key not in settings:
            return None
        # TODO: Implement actual database update via db_service
        return value

    async def list_payment_configs(self) -> List[PaymentConfigOut]:
        """List all payment configs, loading from database if available."""
        # Try to load from database first
        if db_service.is_available():
            try:
                db_configs = db_service.admin_get_all("payment_config", order_by="created_at", desc=False)
                if db_configs and len(db_configs) > 0:
                    # Convert database records to PaymentConfigOut
                    configs = []
                    for db_config in db_configs:
                        try:
                            config = PaymentConfigOut(
                                payment_method=db_config.get("payment_method", ""),
                                is_enabled=db_config.get("is_enabled", False),
                                is_primary=db_config.get("is_primary", False),
                                display_name=db_config.get("display_name", db_config.get("payment_method", "").title()),
                                description=db_config.get("description", ""),
                                configuration=db_config.get("configuration", {}),
                                encrypted_keys=db_config.get("encrypted_keys", {}),
                            )
                            configs.append(config)
                        except Exception as e:
                            print(f"Error converting payment config: {e}")
                            continue
                    
                    # Merge with defaults to ensure all three gateways are present
                    config_dict = {c.payment_method: c for c in configs}
                    for method, default_config in self._payment_configs.items():
                        if method not in config_dict:
                            config_dict[method] = default_config
                    
                    return list(config_dict.values())
            except Exception as e:
                print(f"Error loading payment configs from database: {e}")
                import traceback
                traceback.print_exc()
        
        # Fallback to in-memory defaults
        return list(self._payment_configs.values())

    async def create_payment_config(self, payload: PaymentConfigCreate) -> PaymentConfigOut:
        config = PaymentConfigOut(
            payment_method=payload.payment_method,
            display_name=payload.display_name or payload.payment_method.title(),
            description=payload.description or f"{payload.payment_method.title()} payment gateway",
            configuration=payload.configuration or {},
            is_enabled=payload.is_enabled,
            is_primary=payload.is_primary,
        )
        
        # Save to database if available
        if db_service.is_available():
            try:
                from datetime import datetime
                config_data = {
                    "payment_method": config.payment_method,
                    "display_name": config.display_name,
                    "description": config.description,
                    "configuration": config.configuration,
                    "encrypted_keys": {},
                    "is_enabled": config.is_enabled,
                    "is_primary": config.is_primary,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                db_service.admin_create("payment_config", config_data)
            except Exception as e:
                print(f"Error saving payment config to database: {e}")
                import traceback
                traceback.print_exc()
        
        if config.is_primary:
            await self.set_primary_payment_method(config.payment_method)
        self._payment_configs[config.payment_method] = config
        return config

    async def update_payment_config(self, payment_method: str, payload: PaymentConfigUpdate) -> Optional[PaymentConfigOut]:
        existing = self._payment_configs.get(payment_method)
        if not existing:
            return None

        updated = existing.model_copy(update={k: v for k, v in payload.model_dump(exclude_unset=True).items()})
        self._payment_configs[payment_method] = updated
        
        # Update in database if available
        if db_service.is_available():
            try:
                from datetime import datetime
                # Find the config in database
                db_configs = db_service.admin_get_all("payment_config", filters={"payment_method": payment_method})
                if db_configs and len(db_configs) > 0:
                    update_data = {
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                    payload_dict = payload.model_dump(exclude_unset=True)
                    if "display_name" in payload_dict:
                        update_data["display_name"] = payload_dict["display_name"]
                    if "description" in payload_dict:
                        update_data["description"] = payload_dict["description"]
                    if "configuration" in payload_dict:
                        update_data["configuration"] = payload_dict["configuration"]
                    if "is_enabled" in payload_dict:
                        update_data["is_enabled"] = payload_dict["is_enabled"]
                    if "is_primary" in payload_dict:
                        update_data["is_primary"] = payload_dict["is_primary"]
                    
                    db_service.admin_update("payment_config", db_configs[0].get("id"), update_data)
            except Exception as e:
                print(f"Error updating payment config in database: {e}")

        if payload.is_primary:
            await self.set_primary_payment_method(payment_method)

        return updated

    async def toggle_payment_method(self, payment_method: str, is_enabled: bool) -> Optional[PaymentConfigOut]:
        existing = self._payment_configs.get(payment_method)
        if not existing:
            return None
        updated = existing.model_copy(update={"is_enabled": is_enabled})
        self._payment_configs[payment_method] = updated
        
        # Update in database if available
        if db_service.is_available():
            try:
                from datetime import datetime
                db_configs = db_service.admin_get_all("payment_config", filters={"payment_method": payment_method})
                if db_configs and len(db_configs) > 0:
                    db_service.admin_update("payment_config", db_configs[0].get("id"), {
                        "is_enabled": is_enabled,
                        "updated_at": datetime.utcnow().isoformat(),
                    })
            except Exception as e:
                print(f"Error updating payment config toggle in database: {e}")
        
        return updated

    async def set_primary_payment_method(self, payment_method: str) -> Optional[PaymentConfigOut]:
        if payment_method not in self._payment_configs:
            return None

        # Update in-memory configs
        for method, config in self._payment_configs.items():
            self._payment_configs[method] = config.model_copy(update={"is_primary": method == payment_method})
        
        # Update in database if available
        if db_service.is_available():
            try:
                from datetime import datetime
                # Set all to non-primary first
                all_db_configs = db_service.admin_get_all("payment_config")
                for db_config in all_db_configs:
                    db_service.admin_update("payment_config", db_config.get("id"), {
                        "is_primary": db_config.get("payment_method") == payment_method,
                        "updated_at": datetime.utcnow().isoformat(),
                    })
            except Exception as e:
                print(f"Error updating primary payment method in database: {e}")

        return self._payment_configs[payment_method]


admin_settings_service = AdminSettingsService()

