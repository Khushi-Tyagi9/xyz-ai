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


def handle_turn_stream(session, session_id: str, user_text: str, language: str):
    """Generator version of handle_turn - yields event dicts as the reply streams in.

    Each tool-calling round is itself requested with stream=True, since a Groq/OpenAI
    streamed round can carry ordinary text deltas, tool-call deltas, or (rarely) both.
    Text deltas are surfaced immediately via {"type": "delta"} events; tool-call deltas
    are accumulated silently by index (id/name arrive once, `arguments` arrives in
    fragments that must be concatenated) since partial JSON isn't meaningful to show.
    A round with no accumulated tool calls means its content is the final answer.

    Note: the secrets output filter only runs on the text persisted to memory and sent
    in the final "done" event, not on the live deltas already streamed to the client -
    filtering requires the complete text, which defeats streaming. This is an accepted
    trade-off for a demo; the primary control (the model never sees the real API key)
    is unaffected.
    """
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
    full_reply_parts: list[str] = []

    for _ in range(_MAX_TOOL_ROUNDS):
        stream = client.chat.completions.create(
            model=_MODEL,
            max_tokens=1024,
            messages=messages,
            tools=tool_specs if tool_specs else None,
            tool_choice="auto" if tool_specs else None,
            stream=True,
        )

        round_content = ""
        tool_calls_acc: dict[int, dict] = {}

        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                round_content += delta.content
                full_reply_parts.append(delta.content)
                yield {"type": "delta", "text": delta.content}
            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    entry = tool_calls_acc.setdefault(tc_delta.index, {"id": None, "name": None, "arguments": ""})
                    if tc_delta.id:
                        entry["id"] = tc_delta.id
                    if tc_delta.function and tc_delta.function.name:
                        entry["name"] = tc_delta.function.name
                    if tc_delta.function and tc_delta.function.arguments:
                        entry["arguments"] += tc_delta.function.arguments

        if not tool_calls_acc:
            break

        ordered_calls = [tool_calls_acc[i] for i in sorted(tool_calls_acc)]
        messages.append({
            "role": "assistant",
            "content": round_content or None,
            "tool_calls": [
                {"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": c["arguments"]}}
                for c in ordered_calls
            ],
        })

        for tc in ordered_calls:
            tool_name = tc["name"]
            try:
                tool_args = json.loads(tc["arguments"] or "{}")
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

            messages.append({"role": "tool", "tool_call_id": tc["id"], "content": content})
    else:
        final_text = "I'm having trouble completing that request right now. Please try again or ask to speak with a teacher."
        memory.append_message(session_id, "user", user_text)
        memory.append_message(session_id, "assistant", final_text)
        yield {"type": "delta", "text": final_text}
        yield {"type": "done", "reply": final_text, "flags": flags, "escalation": escalation_status}
        return

    final_text = "".join(full_reply_parts).strip()
    final_text = secrets.filter_response(final_text)

    memory.append_message(session_id, "user", user_text)
    memory.append_message(session_id, "assistant", final_text)

    yield {"type": "done", "reply": final_text, "flags": flags, "escalation": escalation_status}
