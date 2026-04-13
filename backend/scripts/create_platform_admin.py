"""
One-time seed script: creates the LedgerCart Platform Admin account.

Run ONCE after the first deployment:
    docker exec ledgercart-backend python scripts/create_platform_admin.py

Or locally with correct DATABASE_URL:
    python scripts/create_platform_admin.py

IMPORTANT: Change the EMAIL and PASSWORD below before running.
"""
import sys
import os
import uuid

# Allow running from any directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.models import User, UserRole
from app.utils.auth import hash_password

# ─── CHANGE THESE BEFORE RUNNING ─────────────────────────────────────────────
EMAIL    = "platform@ledgercart.com"
PASSWORD = "LedgerConsole@2026!"       # Must be 8+ chars, 1 uppercase, 1 digit
FIRST    = "Platform"
LAST     = "Admin"
# ─────────────────────────────────────────────────────────────────────────────


def main():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == EMAIL).first()
        if existing:
            print(f"[SKIP] Platform admin already exists: {EMAIL}")
            print(f"       Role: {existing.role.value}, Active: {existing.is_active}")
            return

        user = User(
            id=str(uuid.uuid4()),
            email=EMAIL,
            password_hash=hash_password(PASSWORD),
            first_name=FIRST,
            last_name=LAST,
            phone="",
            role=UserRole.PLATFORM_ADMIN,
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"[OK] Platform admin created: {EMAIL}")
        print(f"     Login at: http://localhost:8081")
        print(f"     Remember to update the password after first login!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to create platform admin: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
