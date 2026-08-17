"""Mock login for the demo. Issues a signed token carrying ONLY a user_id.

Role, name, and linked-student ids are deliberately never embedded in the token
and never read from anywhere the client controls - every call resolves them
fresh from the mock ERP (`school_api.get_user`) by user_id. That's what stops a
client from forging a "principal" token by editing a JWT payload or claiming a
role in chat text: the token only proves *which* user is logged in, and the
server is the sole source of truth for *what* that user is allowed to do.
"""
import hashlib
import hmac
import os
import time
from dataclasses import dataclass

from mock_services import school_api

_SECRET = os.environ.get("AUTH_SECRET", "dev-only-mock-secret-do-not-use-in-prod").encode()
_TOKEN_TTL_SECONDS = 60 * 60 * 12


class InvalidTokenError(Exception):
    pass


@dataclass
class Session:
    user_id: str
    role: str
    name: str
    student_id: str | None = None
    linked_student_ids: list[str] | None = None
    teacher_id: str | None = None
    class_ids: list[str] | None = None
    principal_id: str | None = None


def _sign(payload: str) -> str:
    return hmac.new(_SECRET, payload.encode(), hashlib.sha256).hexdigest()


def issue_token(user_id: str) -> str:
    # will raise NotFoundError if user_id is bogus - fail closed at login time
    school_api.get_user(user_id)
    issued_at = str(int(time.time()))
    payload = f"{user_id}:{issued_at}"
    signature = _sign(payload)
    return f"{payload}:{signature}"


def resolve_session(token: str) -> Session:
    try:
        user_id, issued_at, signature = token.split(":", 2)
    except ValueError:
        raise InvalidTokenError("Malformed token")

    expected = _sign(f"{user_id}:{issued_at}")
    if not hmac.compare_digest(expected, signature):
        raise InvalidTokenError("Signature mismatch")

    if time.time() - int(issued_at) > _TOKEN_TTL_SECONDS:
        raise InvalidTokenError("Token expired")

    try:
        user = school_api.get_user(user_id)
    except school_api.NotFoundError:
        raise InvalidTokenError("Unknown user")

    return Session(
        user_id=user["user_id"],
        role=user["role"],
        name=user["name"],
        student_id=user.get("student_id"),
        linked_student_ids=user.get("linked_student_ids"),
        teacher_id=user.get("teacher_id"),
        class_ids=user.get("class_ids"),
        principal_id=user.get("principal_id"),
    )


def list_demo_users() -> list[dict]:
    """For the login screen's role picker - exposes only what's needed to pick an identity."""
    return [
        {"user_id": u["user_id"], "role": u["role"], "name": u["name"]}
        for u in school_api._db["users"]
    ]
