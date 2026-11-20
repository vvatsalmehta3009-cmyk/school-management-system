from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Multi-Tenant School Management Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Cross-Origin Resource Sharing (CORS) for frontend React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production to specific frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router (under /api/v1 and also at root / for flexible Postman/client baseUrl configurations)
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(api_v1_router)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "ok", "service": settings.PROJECT_NAME}

