from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.academic import router as academic_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.users import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(onboarding_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(academic_router)
api_v1_router.include_router(users_router)
