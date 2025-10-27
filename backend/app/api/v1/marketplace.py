from fastapi import APIRouter
from app.api.v1.marketplace_nexas import router as nexas_router
from app.api.v1.marketplace_sellers import router as sellers_router
from app.api.v1.marketplace_purchases import router as purchases_router
from app.api.v1.marketplace_admin import router as admin_router

# Main marketplace router
router = APIRouter(
    prefix="/marketplace",
    tags=["🏪 Marketplace"]
)

# Include all marketplace sub-routers
router.include_router(nexas_router)
router.include_router(sellers_router)
router.include_router(purchases_router)
router.include_router(admin_router)