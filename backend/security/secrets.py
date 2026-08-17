"""Output-side defense in depth: never let a response leak secrets or the system prompt.

RBAC (core/rbac.py) is the primary control for *actions*. This module is a last-resort
filter on the *text* the model produces, in case it's coaxed into echoing something it
shouldn't - it redacts API-key-shaped strings and blocks responses that quote large
chunks of the system prompt verbatim.
"""
import re

from core.personas import _COMMON_RULES

_API_KEY_PATTERN = re.compile(r"sk-ant-[A-Za-z0-9_-]{10,}")
_SYSTEM_PROMPT_SNIPPET = _COMMON_RULES[:60]  # a distinctive chunk to detect verbatim leaks


def filter_response(text: str) -> str:
    if not text:
        return text

    if _SYSTEM_PROMPT_SNIPPET.lower() in text.lower():
        return "I can't share my internal instructions, but I'm happy to help with your question directly."

    return _API_KEY_PATTERN.sub("[redacted]", text)
