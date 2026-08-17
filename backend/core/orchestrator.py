"""Per-turn orchestration: persona + role-filtered tools + LLM tool-use loop + RBAC.

Uses Groq's OpenAI-compatible chat-completions API for the LLM calls.

Design notes:
- The tool list sent to the model is already filtered to the session's role
  (tools/registry.specs_for_role), and every tool call is re-checked against
  `core.rbac.check_permission` before it touches mock data - two independent
  layers, since "the model just won't offer it" is not a security control on
  its own.
- Conversation memory stores plain (role, text) turns only. Tool-call/tool-result
  content is kept local to a single `handle_turn` call and is not persisted -
  simpler than serializing tool call state across HTTP requests, and the model
  doesn't need to "remember" tool call mechanics, just outcomes, which show up
  in its own final text anyway.
"""
import json
import os

from openai import OpenAI

from core import memory, personas
from core.rbac import PermissionDeniedError, check_permission
from mock_services import school_api
from security import input_guard, secrets
from tools import registry

_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
_MAX_TOOL_ROUNDS = 4

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set - copy backend/.env.example to backend/.env and fill it in.")
        _client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    return _client


def _history_as_messages(session_id: str) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in memory.get_history(session_id)]


def _build_session_context(session) -> str:
    """Resolves IDs the model would otherwise have to ask the user for."""
    if session.role == "student" and session.student_id:
        return f"Session context: the logged-in student's own student_id is {session.student_id} - use it directly, never ask for it."

    if session.role == "parent" and session.linked_student_ids:
        children = []
        for sid in session.linked_student_ids:
            try:
                s = school_api.get_student(sid)
                children.append(f"{s['name']} (student_id={sid})")
            except school_api.NotFoundError:
                children.append(f"student_id={sid}")
        return (
            "Session context: this parent's linked child(ren): " + ", ".join(children) +
            " - use the right student_id directly, never ask for it. If there are multiple "
            "children and the request is ambiguous, ask which child they mean."
        )

    if session.role == "teacher" and session.class_ids:
        roster = []
        for cid in session.class_ids:
            for s in school_api.list_students_in_class(cid):
                roster.append(f"{s['name']} (student_id={s['student_id']})")
        return (
            f"Session context: this teacher's own class_ids: {', '.join(session.class_ids)}. "
            "Roster (name -> student_id) for resolving student names mentioned in chat: " +
            ", ".join(roster) + "."
        )

    return ""


def handle_turn(session, session_id: str, user_text: str, language: str) -> dict:
    flags = input_guard.scan(user_text)
    annotated_text = input_guard.annotate_if_suspicious(user_text, flags)

    session_context = _build_session_context(session)
    system_prompt = personas.build_system_prompt(session.role, session.name, language, session_context)
    tool_specs = registry.openai_specs_for_role(session.role)

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(_history_as_messages(session_id))
    messages.append({"role": "user", "content": annotated_text})

    client = _get_client()
    escalation_status = None
    message = None

    for _ in range(_MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model=_MODEL,
            max_tokens=1024,
            messages=messages,
            tools=tool_specs if tool_specs else None,
            tool_choice="auto" if tool_specs else None,
        )
        message = response.choices[0].message

        if not message.tool_calls:
            break

        messages.append({
            "role": "assistant",
            "content": message.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in message.tool_calls
            ],
        })

        for tc in message.tool_calls:
            tool_name = tc.function.name
            try:
                tool_args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                tool_args = {}

            try:
                check_permission(session, tool_name, tool_args)
                impl = registry.get_impl(tool_name)
                if impl is None:
                    raise PermissionDeniedError(f"Unknown tool '{tool_name}'")
                result = impl(session, tool_args)
                if tool_name in ("request_teacher_call", "request_management_call") and result.get("status") not in ("needs_confirmation",):
                    escalation_status = result
                content = json.dumps(result)
            except (PermissionDeniedError, school_api.NotFoundError) as e:
                content = json.dumps({"error": str(e)})

            messages.append({"role": "tool", "tool_call_id": tc.id, "content": content})
    else:
        final_text = "I'm having trouble completing that request right now. Please try again or ask to speak with a teacher."
        memory.append_message(session_id, "user", user_text)
        memory.append_message(session_id, "assistant", final_text)
        return {"reply": final_text, "flags": flags, "escalation": escalation_status}

    final_text = (message.content or "").strip()
    final_text = secrets.filter_response(final_text)

    memory.append_message(session_id, "user", user_text)
    memory.append_message(session_id, "assistant", final_text)

    return {"reply": final_text, "flags": flags, "escalation": escalation_status}
