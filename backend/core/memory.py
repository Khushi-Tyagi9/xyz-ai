"""Conversation memory, keyed by session_id.

In-memory dict for the MVP - fine for a demo/single-process run. The interface
(get_history/append/reset) is the seam to swap in Redis or a DB-backed store
later without touching the orchestrator.
"""
from dataclasses import dataclass, field

_MAX_TURNS = 20  # messages kept per session, oldest trimmed first


@dataclass
class StoredMessage:
    role: str  # "user" | "assistant"
    content: object  # str or Anthropic content-block list (for tool_use/tool_result turns)


_store: dict[str, list[StoredMessage]] = {}


def get_history(session_id: str) -> list[StoredMessage]:
    return _store.setdefault(session_id, [])


def append_message(session_id: str, role: str, content: object) -> None:
    history = get_history(session_id)
    history.append(StoredMessage(role=role, content=content))
    if len(history) > _MAX_TURNS:
        del history[: len(history) - _MAX_TURNS]


def reset(session_id: str) -> None:
    _store.pop(session_id, None)
