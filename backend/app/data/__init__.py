from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

DATA_DIR = Path(__file__).resolve().parent


def _load_json(name: str) -> Any:
    path = DATA_DIR / f"{name}.json"
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


PRODUCTS: List[Dict[str, Any]] = _load_json("products")
CATEGORIES: List[Dict[str, Any]] = _load_json("categories")
TESTIMONIALS: List[Dict[str, Any]] = _load_json("testimonials")
SETTINGS: Dict[str, Any] = _load_json("settings")
PINCODE_DETAILS: List[Dict[str, Any]] = _load_json("pincodes")


