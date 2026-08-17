"""Fake school-ERP backend. Stands in for the real student/parent/staff APIs.

Everything here is in-memory, seeded from data.json, and reset on process restart.
Tool implementations in `tools/` call these functions; they never talk to the LLM
and never see role/permission info - that's enforced one layer up in `core/rbac.py`.
"""
import json
import uuid
from datetime import date
from pathlib import Path
from typing import Literal

_DATA_PATH = Path(__file__).parent / "data.json"


def _load():
    with open(_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


_db = _load()


class NotFoundError(Exception):
    pass


def get_user(user_id: str) -> dict:
    for u in _db["users"]:
        if u["user_id"] == user_id:
            return u
    raise NotFoundError(f"No user {user_id}")


def get_student(student_id: str) -> dict:
    for s in _db["students"]:
        if s["student_id"] == student_id:
            return s
    raise NotFoundError(f"No student {student_id}")


def list_students_in_class(class_id: str) -> list[dict]:
    return [s for s in _db["students"] if s["class_id"] == class_id]


def get_student_attendance(student_id: str) -> dict:
    student = get_student(student_id)
    records = [r for r in _db["attendance_log"] if r["student_id"] == student_id]
    records.sort(key=lambda r: r["date"], reverse=True)
    return {
        "student_id": student_id,
        "name": student["name"],
        "attendance_pct": student["attendance_pct"],
        "recent_records": records[:7],
    }


def mark_attendance(student_id: str, status: Literal["present", "absent"], on_date: str | None = None) -> dict:
    student = get_student(student_id)
    on_date = on_date or date.today().isoformat()

    existing = next(
        (r for r in _db["attendance_log"] if r["student_id"] == student_id and r["date"] == on_date),
        None,
    )
    if existing:
        existing["status"] = status
    else:
        _db["attendance_log"].append({"student_id": student_id, "date": on_date, "status": status})

    _recompute_attendance_pct(student_id)

    return {
        "student_id": student_id,
        "name": student["name"],
        "date": on_date,
        "status": status,
    }


def _recompute_attendance_pct(student_id: str) -> None:
    records = [r for r in _db["attendance_log"] if r["student_id"] == student_id]
    if not records:
        return
    present = sum(1 for r in records if r["status"] == "present")
    pct = round((present / len(records)) * 100, 1)
    for s in _db["students"]:
        if s["student_id"] == student_id:
            s["attendance_pct"] = pct


def get_school_attendance_summary() -> dict:
    students = _db["students"]
    avg = round(sum(s["attendance_pct"] for s in students) / len(students), 1) if students else 0.0
    by_class: dict[str, list[float]] = {}
    for s in students:
        by_class.setdefault(s["class_id"], []).append(s["attendance_pct"])

    class_breakdown = []
    for c in _db["classes"]:
        pcts = by_class.get(c["class_id"], [])
        class_breakdown.append({
            "class_id": c["class_id"],
            "class_name": c["name"],
            "avg_attendance_pct": round(sum(pcts) / len(pcts), 1) if pcts else 0.0,
            "student_count": len(pcts),
        })

    below_threshold = [s for s in students if s["attendance_pct"] < 80]

    return {
        "overall_avg_attendance_pct": avg,
        "total_students": len(students),
        "class_breakdown": class_breakdown,
        "students_below_80pct": [{"student_id": s["student_id"], "name": s["name"], "attendance_pct": s["attendance_pct"]} for s in below_threshold],
    }


def create_escalation_request(kind: Literal["teacher_call", "management_call"], requested_by_user_id: str, student_id: str | None, note: str) -> dict:
    request_id = f"esc-{uuid.uuid4().hex[:8]}"
    record = {
        "request_id": request_id,
        "kind": kind,
        "requested_by_user_id": requested_by_user_id,
        "student_id": student_id,
        "note": note,
        "status": "submitted",
    }
    _db["escalation_requests"].append(record)
    return record


def get_escalation_request(request_id: str) -> dict:
    for r in _db["escalation_requests"]:
        if r["request_id"] == request_id:
            return r
    raise NotFoundError(f"No escalation request {request_id}")
