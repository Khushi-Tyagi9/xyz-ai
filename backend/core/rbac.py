"""Application-layer authorization. This is the real security boundary.

The LLM chooses which tool to call and with what arguments, but that choice is
never trusted on its own. Every tool call is re-checked here against a static
role -> allowed-tools table PLUS an ownership predicate (e.g. a parent can only
ever query the attendance of a student listed in their own `linked_student_ids`).
If either check fails, the tool never runs - regardless of what the model
"decided" or what the user claimed about their own role in chat text.
"""
from auth.mock_auth import Session
from mock_services import school_api


class PermissionDeniedError(Exception):
    pass


ROLE_TOOLS: dict[str, set[str]] = {
    "student": {"get_own_attendance", "request_teacher_call", "request_management_call"},
    "parent": {"get_child_attendance", "request_teacher_call", "request_management_call"},
    "teacher": {"mark_attendance", "list_pending_requests"},
    "principal": {"get_school_attendance_summary", "list_pending_requests"},
}


def allowed_tools_for_role(role: str) -> set[str]:
    return ROLE_TOOLS.get(role, set())


def check_permission(session: Session, tool_name: str, tool_args: dict) -> None:
    if tool_name not in allowed_tools_for_role(session.role):
        raise PermissionDeniedError(
            f"Role '{session.role}' is not permitted to call '{tool_name}'"
        )

    if tool_name == "get_own_attendance":
        requested = tool_args.get("student_id")
        if requested and requested != session.student_id:
            raise PermissionDeniedError("Students may only view their own attendance")

    elif tool_name == "get_child_attendance":
        requested = tool_args.get("student_id")
        linked = session.linked_student_ids or []
        if requested not in linked:
            raise PermissionDeniedError("Parents may only view attendance of their own linked child")

    elif tool_name == "mark_attendance":
        requested = tool_args.get("student_id")
        try:
            student = school_api.get_student(requested)
        except school_api.NotFoundError:
            raise PermissionDeniedError("Unknown student")
        if student["class_id"] not in (session.class_ids or []):
            raise PermissionDeniedError("Teachers may only mark attendance for their own class")

    elif tool_name in ("get_school_attendance_summary", "list_pending_requests"):
        pass  # role check above is sufficient; the tool itself scopes results to
        # this session's own teacher_id/role, there's no caller-supplied id to check

    elif tool_name in ("request_teacher_call", "request_management_call"):
        requested_student = tool_args.get("student_id")
        if session.role == "student" and requested_student not in (None, session.student_id):
            raise PermissionDeniedError("Students may only escalate about themselves")
        if session.role == "parent" and requested_student not in (session.linked_student_ids or []):
            raise PermissionDeniedError("Parents may only escalate about their own linked child")
