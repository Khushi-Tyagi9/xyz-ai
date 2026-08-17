from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from auth import mock_auth

router = APIRouter()


class LoginRequest(BaseModel):
    user_id: str


class LoginResponse(BaseModel):
    token: str
    role: str
    name: str


@router.get("/auth/demo-users")
def demo_users():
    return mock_auth.list_demo_users()


@router.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest):
    try:
        token = mock_auth.issue_token(body.user_id)
        session = mock_auth.resolve_session(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Unknown demo user_id")
    return LoginResponse(token=token, role=session.role, name=session.name)


@router.get("/auth/me")
def me(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    try:
        session = mock_auth.resolve_session(token)
    except mock_auth.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {
        "user_id": session.user_id,
        "role": session.role,
        "name": session.name,
    }
