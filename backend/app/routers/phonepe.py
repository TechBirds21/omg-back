import logging

from fastapi import APIRouter, HTTPException, status

from ..services.phonepe import PhonePeInitRequest, PhonePeStatusRequest, service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/init")
async def initiate_phonepe_payment(payload: PhonePeInitRequest):
    try:
        return await service.initiate_payment(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - safety net
        logger.exception("Unhandled error in PhonePe init")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") from exc


@router.post("/status")
async def phonepe_order_status(payload: PhonePeStatusRequest):
    try:
        return await service.get_order_status(payload)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - safety net
        logger.exception("Unhandled error in PhonePe status")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") from exc


