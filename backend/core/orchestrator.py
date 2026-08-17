"""Per-turn orchestration: persona + role-filtered tools + Claude tool-use loop + RBAC.

Design notes:
- The tool list sent to the model is already filtered to the session's role
  (tools/registry.specs_for_role), and every tool call is re-checked against
  `core.rbac.check_permission` before it touches mock data - two independent
  layers, since "the model just won't offer it" is not a security control on
  its own.
- Conversation memory stores plain (role, text) turns only. Tool-use/tool-result
  content blocks are kept local to a single `handle_turn` call and are not
  persisted - simpler than serializing tool call state across HTTP requests,
  and the model doesn't need to "remember" tool call mechanics, just outcomes,
  which show up in its own final text anyway.
"""
import os

import anthropic

from core import memory, personas
from core.rbac import PermissionDeniedError, check_permission
from mock_services import school_api
from security import input_guard, secrets
from tools import registry

_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
_MAX_TOOL_ROUNDS = 4

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set - copy backend/.env.example to backend/.env and fill it in.")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _history_as_messages(session_id: str) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in memory.get_history(session_id)]


def handle_turn(session, session_id: str, user_text: str, language: str) -> dict:
    flags = input_guard.scan(user_text)
    annotated_text = input_guard.annotate_if_suspicious(user_text, flags)

    system_prompt = personas.build_system_prompt(session.role, session.name, language)
    tool_specs = registry.specs_for_role(session.role)

    messages = _history_as_messages(session_id)
    messages.append({"role": "user", "content": annotated_text})

    client = _get_client()
    escalation_status = None

    for _ in range(_MAX_TOOL_ROUNDS):
        response = client.messages.create(
            model=_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=tool_specs if tool_specs else None,
        )

        if response.stop_reason != "tool_use":
            break

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []

        for block in response.content:
            if block.type != "tool_use":
                continue

            tool_name = block.name
            tool_args = block.input or {}

            try:
                check_permission(session, tool_name, tool_args)
                impl = registry.get_impl(tool_name)
                if impl is None:
                    raise PermissionDeniedError(f"Unknown tool '{tool_name}'")
                result = impl(session, tool_args)
                if tool_name in ("request_teacher_call", "request_management_call") and result.get("status") not in ("needs_confirmation",):
                    escalation_status = result
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result),
                })
            except (PermissionDeniedError, school_api.NotFoundError) as e:
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": f"Error: {e}",
                    "is_error": True,
                })

        messages.append({"role": "user", "content": tool_results})
    else:
        # exhausted rounds without a final answer - fail closed with a plain message
        final_text = "I'm having trouble completing that request right now. Please try again or ask to speak with a teacher."
        memory.append_message(session_id, "user", user_text)
        memory.append_message(session_id, "assistant", final_text)
        return {"reply": final_text, "flags": flags, "escalation": escalation_status}

    final_text = "".join(b.text for b in response.content if b.type == "text").strip()
    final_text = secrets.filter_response(final_text)

    memory.append_message(session_id, "user", user_text)
    memory.append_message(session_id, "assistant", final_text)

    return {"reply": final_text, "flags": flags, "escalation": escalation_status}
