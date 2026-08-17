"""The four required use-case tools, as Anthropic tool specs + implementations.

Each tool is deliberately narrow (one action) so `core/rbac.py` can grant/deny
them per role without ambiguity - e.g. a Student session simply never receives
`mark_attendance` in its tool list, and even if it somehow did, `rbac.check_permission`
would still reject the call before `school_api` is touched.
"""
from mock_services import school_api

TOOL_SPECS = [
    {
        "name": "get_own_attendance",
        "description": "Get the currently logged-in student's own attendance percentage and recent daily records.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_child_attendance",
        "description": "Get attendance percentage and recent daily records for a parent's child.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_id": {"type": "string", "description": "The student_id of the parent's child."}
            },
            "required": ["student_id"],
        },
    },
    {
        "name": "mark_attendance",
        "description": "Mark a student present or absent for a given date (defaults to today). Only usable by teachers for their own class.",
        "input_schema": {
            "type": "object",
            "properties": {
                "student_id": {"type": "string"},
                "status": {"type": "string", "enum": ["present", "absent"]},
                "date": {"type": "string", "description": "ISO date YYYY-MM-DD, defaults to today if omitted."},
            },
            "required": ["student_id", "status"],
        },
    },
    {
        "name": "get_school_attendance_summary",
        "description": "Get school-wide attendance analytics: overall average, per-class breakdown, and students below 80% attendance.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


def get_own_attendance(session, args: dict) -> dict:
    return school_api.get_student_attendance(session.student_id)


def get_child_attendance(session, args: dict) -> dict:
    return school_api.get_student_attendance(args["student_id"])


def mark_attendance(session, args: dict) -> dict:
    return school_api.mark_attendance(
        student_id=args["student_id"],
        status=args["status"],
        on_date=args.get("date"),
    )


def get_school_attendance_summary(session, args: dict) -> dict:
    return school_api.get_school_attendance_summary()


IMPLS = {
    "get_own_attendance": get_own_attendance,
    "get_child_attendance": get_child_attendance,
    "mark_attendance": mark_attendance,
    "get_school_attendance_summary": get_school_attendance_summary,
}
