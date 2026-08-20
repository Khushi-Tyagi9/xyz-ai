"""Escalation-to-human tools.

Both tools require `confirm: true` before they create a real escalation record.
This is enforced here in code, not just via prompt instructions: if the model
calls the tool speculatively (confirm omitted/false), nothing is created and the
tool returns "needs_confirmation" so the assistant has to ask the user first and
call again only after they say yes. This backs up the persona-prompt rule that
XYZ AI must never claim a human was contacted without a real confirmed request.
"""
from mock_services import school_api

TOOL_SPECS = [
    {
        "name": "request_teacher_call",
        "description": (
            "Submit a request for the student's teacher to call about a concern. "
            "Only actually submits when confirm=true; otherwise just checks it's askable "
            "and returns needs_confirmation so you can ask the user to confirm first."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "student_id": {"type": "string", "description": "Omit if the requester is the student themself."},
                "note": {"type": "string", "description": "Short summary of what the call should be about."},
                "confirm": {"type": "boolean", "description": "Set true only after the user has explicitly confirmed they want this submitted."},
            },
            "required": ["note", "confirm"],
        },
    },
    {
        "name": "request_management_call",
        "description": (
            "Submit a request for school management/the principal's office to call about a concern. "
            "Only actually submits when confirm=true; otherwise returns needs_confirmation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "student_id": {"type": "string", "description": "Omit if the requester is the student themself."},
                "note": {"type": "string", "description": "Short summary of what the call should be about."},
                "confirm": {"type": "boolean", "description": "Set true only after the user has explicitly confirmed they want this submitted."},
            },
            "required": ["note", "confirm"],
        },
    },
    {
        "name": "list_pending_requests",
        "description": (
            "List escalation requests (talk-to-teacher / contact-management) waiting for this user "
            "to act on. For a teacher, this is requests about students in their own class. For "
            "principal/management, this is every request school-wide."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


def _submit(kind: str, session, args: dict) -> dict:
    if not args.get("confirm"):
        return {"status": "needs_confirmation", "message": "Ask the user to explicitly confirm before submitting this request."}

    student_id = args.get("student_id") or session.student_id or (session.linked_student_ids or [None])[0]
    record = school_api.create_escalation_request(
        kind=kind,
        requested_by_user_id=session.user_id,
        student_id=student_id,
        note=args.get("note", ""),
    )
    return record


def request_teacher_call(session, args: dict) -> dict:
    return _submit("teacher_call", session, args)


def request_management_call(session, args: dict) -> dict:
    return _submit("management_call", session, args)


def list_pending_requests(session, args: dict) -> dict:
    if session.role == "teacher":
        items = school_api.list_escalation_requests_for_teacher(session.teacher_id)
    elif session.role == "principal":
        items = school_api.list_escalation_requests_for_management()
    else:
        items = []
    return {"count": len(items), "requests": items}


IMPLS = {
    "request_teacher_call": request_teacher_call,
    "request_management_call": request_management_call,
    "list_pending_requests": list_pending_requests,
}
