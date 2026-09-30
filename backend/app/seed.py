"""
Seeds the database with real accounts for the six demo users that used to
be the fake "account switcher", plus a couple of sample returns so there's
something to click into immediately.

Run with: python -m app.seed
Default password for every seeded account: password123
"""
from .database import SessionLocal, engine, Base
from . import models, auth

Base.metadata.create_all(bind=engine)

SEED_USERS = [
    dict(id="u_client_maria", name="Maria Alvarez", email="maria@example.com", role="client", initials="MA", note="Individual taxpayer, active return"),
    dict(id="u_client_new", name="David Chen", email="david@example.com", role="client", initials="DC", note="Brand-new account", first_run=True),
    dict(id="u_preparer_jordan", name="Jordan Blake", email="jordan@firm.com", role="preparer", initials="JB", firm_role="Senior Preparer"),
    dict(id="u_reviewer_sam", name="Sam Okafor", email="sam@firm.com", role="reviewer", initials="SO", firm_role="Reviewing CPA"),
    dict(id="u_admin_lee", name="Lee Park", email="lee@firm.com", role="admin", initials="LP", firm_role="Firm Administrator"),
    dict(id="u_seasonal_ren", name="Ren Osei", email="ren@firm.com", role="seasonal", initials="RO", firm_role="Seasonal Preparer (Level 1)"),
]

DEFAULT_PASSWORD = "password123"


def run():
    db = SessionLocal()
    try:
        if db.query(models.User).count() > 0:
            print("Users already exist — skipping seed. Delete ledger.db to reset.")
            return

        for u in SEED_USERS:
            db.add(models.User(hashed_password=auth.hash_password(DEFAULT_PASSWORD), **u))
        db.commit()

        maria_return = models.Return(
            id="ret_1001", client_name="Maria Alvarez", client_id="u_client_maria",
            type="Individual (1040)", year=2025, stage="In Review",
            preparer="Jordan Blake", reviewer="Sam Okafor", urgency="high", due_date="2026-08-01",
        )
        david_return = models.Return(
            id="ret_1002", client_name="David Chen", client_id="u_client_new",
            type="Individual (1040)", year=2025, stage="Intake",
            preparer="Jordan Blake", urgency="low", due_date="2026-09-15",
        )
        db.add_all([maria_return, david_return])
        db.commit()

        print(f"Seeded {len(SEED_USERS)} users and 2 sample returns.")
        print(f"Every account's password is: {DEFAULT_PASSWORD}")
        for u in SEED_USERS:
            print(f"  {u['email']}  ({u['role']})")
    finally:
        db.close()


if __name__ == "__main__":
    run()
