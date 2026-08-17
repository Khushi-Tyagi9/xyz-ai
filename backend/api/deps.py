from fastapi import Header, HTTPException

from auth import mock_auth


def get_session(authorization: str = Header(default="")) -> mock_auth.Session:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        return mock_auth.resolve_session(token)
    except mock_auth.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
