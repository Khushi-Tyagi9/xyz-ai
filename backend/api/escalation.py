from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_session
from auth.mock_auth import Session
from mock_services import school_api

router = APIRouter()


@router.get("/escalation/status/{request_id}")
def escalation_status(request_id: str, session: Session = Depends(get_session)):
    try:
        record = school_api.get_escalation_request(request_id)
    except school_api.NotFoundError:
        raise HTTPException(status_code=404, detail="No such escalation request")

    if record["requested_by_user_id"] != session.user_id:
        raise HTTPException(status_code=403, detail="Not your escalation request")

    return record
