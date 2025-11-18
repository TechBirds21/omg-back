"""Payment gateway APIs."""

from fastapi import APIRouter

from . import easebuzz, zohopay, websocket

router = APIRouter()

router.include_router(easebuzz.router)
router.include_router(zohopay.router)
router.include_router(websocket.router)

