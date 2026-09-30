from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth_router, returns_router, documents_router, ai_router, messages_router, tasks_router, users_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ledger API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # the Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(returns_router.router)
app.include_router(documents_router.router)
app.include_router(ai_router.router)
app.include_router(messages_router.router)
app.include_router(tasks_router.router)
app.include_router(users_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
