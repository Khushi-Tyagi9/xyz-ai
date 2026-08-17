"""Combines all tool specs/impls and filters them per-role for the orchestrator."""
from core.rbac import allowed_tools_for_role
from tools import attendance, escalation

ALL_SPECS = attendance.TOOL_SPECS + escalation.TOOL_SPECS
ALL_IMPLS = {**attendance.IMPLS, **escalation.IMPLS}


def specs_for_role(role: str) -> list[dict]:
    allowed = allowed_tools_for_role(role)
    return [spec for spec in ALL_SPECS if spec["name"] in allowed]


def openai_specs_for_role(role: str) -> list[dict]:
    """Same tool specs, wrapped in OpenAI/Groq function-calling format."""
    return [
        {
            "type": "function",
            "function": {
                "name": spec["name"],
                "description": spec["description"],
                "parameters": spec["input_schema"],
            },
        }
        for spec in specs_for_role(role)
    ]


def get_impl(tool_name: str):
    return ALL_IMPLS.get(tool_name)
