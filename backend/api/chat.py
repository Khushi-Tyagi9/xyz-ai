import json

import openai
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.deps import get_session
from auth.mock_auth import Session
from core import orchestrator

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: str = "English"


class ChatResponse(BaseModel):
    reply: str
    flags: list[str] = []
    escalation: dict | None = None


def _friendly_error_detail(e: Exception) -> str:
    if isinstance(e, openai.AuthenticationError):
        return "GROQ_API_KEY is missing or invalid - set a real key in backend/.env"
    if isinstance(e, openai.APIError):
        return f"Upstream LLM error: {e}"
    if isinstance(e, RuntimeError):
        return str(e)
    return "Something went wrong handling that message."


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)):
    try:
        result = orchestrator.handle_turn(session, body.session_id, body.message, body.language)
    except openai.AuthenticationError:
        raise HTTPException(status_code=502, detail="GROQ_API_KEY is missing or invalid - set a real key in backend/.env")
    except openai.APIError as e:
        raise HTTPException(status_code=502, detail=f"Upstream LLM error: {e}")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(**result)


def _stream_events(session: Session, body: ChatRequest):
    try:
        for event in orchestrator.handle_turn_stream(session, body.session_id, body.message, body.language):
            yield json.dumps(event) + "\n"
    except Exception as e:  # noqa: BLE001 - stream body is the only channel left to report this
        yield json.dumps({"type": "error", "detail": _friendly_error_detail(e)}) + "\n"


@router.post("/chat/stream")
def chat_stream(body: ChatRequest, session: Session = Depends(get_session)):
    return StreamingResponse(_stream_events(session, body), media_type="application/x-ndjson")
