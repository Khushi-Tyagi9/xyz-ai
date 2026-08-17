import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth, chat, escalation

app = FastAPI(title="XYZ AI", description="Human-like school assistant backend")

origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["auth"])
app.include_router(chat.router, tags=["chat"])
app.include_router(escalation.router, tags=["escalation"])


@app.get("/health")
def health():
    return {"status": "ok"}
