# Ledger: real backend + real AI

This is the original click-through prototype (`frontend/`), now backed by
a real FastAPI service (`backend/`) with a real database, real file
storage, real auth, and real AI document extraction via Google Gemini — replacing
everything the original README listed under "What's simulated."

## What changed

| Before | Now |
|---|---|
| Simulated login (account switcher) | Real JWT auth. Six seeded accounts, real passwords. |
| `data.js` hardcoded returns/documents/tasks | Real SQLite/Postgres database. |
| File picker that just added a name to memory | Real file upload, stored on disk, tied to a real document record. |
| Hand-authored confidence scores & flags | Real extraction via a LangGraph pipeline calling Google's Gemini vision API, with a clearly-labeled mock fallback if no API key is set. |
| Everything reset on refresh | Everything persists. |

Permissions are enforced server-side too, not just hidden in the UI — a
client genuinely cannot fetch another client's return, and a staff member
genuinely cannot verify fields on their own personal return.

## The extraction pipeline

Uploading a document doesn't just make one API call. It runs a small
LangGraph workflow (`backend/app/ai_pipeline.py`):

```
classify_document -> extract_fields -> cross_validate --[low confidence, first try]--> retry -> back to extract_fields
                                                        --[inconsistent or still low]--> flag_for_review -> END
                                                        --[clean]--------------------->  auto_accept -> END
```

- **classify_document** — one Gemini call, figures out if it's a W-2,
  1099-NEC, 1099-MISC, or 1098, so extraction uses a tailored prompt
  instead of one generic one.
- **extract_fields** — pulls the actual values, with a genuine per-field
  confidence score.
- **cross_validate** — plain code, no LLM: checks the new fields against
  fields *already on the return from other documents* — catches a
  mismatched employer name, a wages/SS-wages ratio that doesn't make
  sense, or the same value uploaded twice. This is the part a single
  isolated API call can't do, since it never sees more than one document.
- **retry loop** — if a field comes back under the confidence threshold,
  the graph loops back into extraction with a narrower prompt asking
  Gemini to re-read just that one region, once, before giving up and
  flagging it for a human.
- Only if everything comes back clean and confident does a document
  auto-verify; anything else lands in AI Insights for a preparer to
  review, same as before.

## Running it

You need two terminals.

**Backend:**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate    # optional but recommended
pip install -r requirements.txt
cp .env.example .env
# edit .env and add your GEMINI_API_KEY if you want real AI extraction
# (without it, extraction returns a clearly-labeled mock instead of erroring)
python -m app.seed        # creates the database and six demo accounts
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) and log in
with any of the seeded accounts (shown on the login screen), password
`password123` for all of them.

## What's still simulated

- **Persistence of the demo data itself.** Delete `backend/ledger.db` to
  reset to a clean slate (2 seed returns, 6 users, no documents).
- **Document rendering in the trace panel.** The "here's the region on the
  page" preview is still a schematic placeholder rather than an actual
  rendered page image — a real implementation would rasterize the source
  PDF/image and overlay the region Gemini reported.
- **Production auth hardening.** Sessions are simple 24h JWTs with no
  refresh-token flow, and there's no email verification, password reset,
  or rate limiting on login attempts — fine for a prototype, not for a
  real firm handling client SSNs.

## What's real now

Everything else the original README's "What's genuinely wired up" section
described is still true, but now backed by an actual server:

- Navigation, role switching, permission boundaries
- Search/filtering at volume
- Dashboard prioritization (real sort, real per-user scoping)
- Source traceability (real field ↔ document ↔ page linkage)
- Manual correction with a real "corrected by X, was $Y" trail
- AI Insights actions (accept/correct/dismiss) that keep Review &
  Traceability and AI Insights in agreement with each other — because
  they're now reading the same database instead of two independently
  faked data structures
- Messages, grouped into real threads
- Document upload (a real file, really stored, really tied to the return)

## Project structure

```
backend/
  app/
    main.py            FastAPI app + router wiring
    database.py         SQLite/Postgres connection
    models.py            SQLAlchemy tables (the real data model)
    schemas.py            Pydantic request/response contract
    auth.py                 JWT auth, password hashing, role checks
    ai_pipeline.py          LangGraph extraction pipeline: classify -> extract
                             -> cross-validate -> retry/accept/flag
    seed.py                    Creates the database + demo accounts
    routers/
      auth_router.py            /auth/login, /auth/me
      returns_router.py          /returns/*
      documents_router.py         /documents/* (real upload)
      ai_router.py                  /ai/extract/*, /ai/flags/*, /ai/fields/*
      messages_router.py             /returns/:id/messages
      tasks_router.py                  /tasks (real prioritization)
      users_router.py                   /users (team directory)
  requirements.txt
  .env.example

frontend/
  src/
    api.js              The API client — talks to the backend above
    UserContext.jsx       Real login/logout, session resume on refresh
    data.js                Now only static config (stage names, nav
                             labels) — no more fabricated business data
    pages/, components/     Same UI as before, now fetching real data
```

## If you want to keep building

The pieces are separated enough to hand off independently if you want to
parallelize further work:

- **Backend**: add endpoints, tighten permissions, swap SQLite for
  Postgres by setting `DATABASE_URL`.
- **AI pipeline** (`backend/app/ai_pipeline.py`): tune the extraction or
  classification prompts, add more cross-validation rules, or extend the
  retry loop to more than one attempt.
- **Frontend**: anything visual — the API contract in `schemas.py` is the
  source of truth both sides should code against.
