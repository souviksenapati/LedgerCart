import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base

# Import all models to register them
from app.models.models import *

# Import routes
from app.routes import (
    auth, products, categories, cart, orders, coupons, reviews, wishlist, 
    addresses, banners, admin, upload,
    suppliers, b2b_customers, warehouses, purchases, sales, payments
)

# Create tables
Base.metadata.create_all(bind=engine)

_IS_PRODUCTION = os.getenv("ENVIRONMENT", "dev") == "production"

app = FastAPI(
    title="LedgerCart API",
    description="Full-scale E-Commerce API for LedgerCart Store",
    version="1.0.0",
    # Disable interactive docs in production to avoid exposing the full API schema
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
    openapi_url=None if _IS_PRODUCTION else "/openapi.json",
)

# Startup Security Check
_INSECURE_KEYS = {"change-me", "your-secret-key-change-in-production", "secret", ""}

@app.on_event("startup")
async def startup_event():
    if _IS_PRODUCTION:
        if settings.SECRET_KEY in _INSECURE_KEYS:
            import logging
            logging.critical(
                "CRITICAL SECURITY RISK: SECRET_KEY is set to a known-insecure default value. "
                "Update the SECRET_KEY environment variable immediately before going live."
            )
            raise RuntimeError(
                "CRITICAL SECURITY RISK: SECRET_KEY is a known-insecure default. "
                "Set a strong random SECRET_KEY in your environment."
            )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(coupons.router)
app.include_router(reviews.router)
app.include_router(wishlist.router)
app.include_router(addresses.router)
app.include_router(banners.router)
app.include_router(admin.router)
app.include_router(upload.router)

# Inventory Management Routes
app.include_router(suppliers.router)
app.include_router(b2b_customers.router)
app.include_router(warehouses.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(payments.router)


@app.get("/")
def root():
    return {"message": "LedgerCart API", "version": "1.0.0", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
