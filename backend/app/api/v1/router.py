from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.academic import router as academic_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(academic_router)
