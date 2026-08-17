import anthropic
from fastapi import APIRouter, Depends, HTTPException
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


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)):
    try:
        result = orchestrator.handle_turn(session, body.session_id, body.message, body.language)
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=502, detail="ANTHROPIC_API_KEY is missing or invalid - set a real key in backend/.env")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Upstream LLM error: {e}")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(**result)
