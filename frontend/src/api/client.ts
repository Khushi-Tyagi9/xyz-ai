const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface DemoUser {
  user_id: string;
  role: "student" | "parent" | "teacher" | "principal";
  name: string;
}

export interface LoginResponse {
  token: string;
  role: string;
  name: string;
}

export interface ChatResponse {
  reply: string;
  flags: string[];
  escalation: Record<string, unknown> | null;
}

export class ApiError extends Error {
  kind: "network" | "http";
  constructor(message: string, kind: "network" | "http") {
    super(message);
    this.kind = kind;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed: ${res.status}`, "http");
  }
  return res.json();
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError("Can't reach the XYZ AI server. Check your connection and try again.", "network");
  }
}

export function listDemoUsers(): Promise<DemoUser[]> {
  return safeFetch(`${BASE_URL}/auth/demo-users`).then((r) => handle<DemoUser[]>(r));
}

export function login(user_id: string): Promise<LoginResponse> {
  return safeFetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  }).then((r) => handle<LoginResponse>(r));
}

export function sendChat(
  token: string,
  session_id: string,
  message: string,
  language: string
): Promise<ChatResponse> {
  return safeFetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id, message, language }),
  }).then((r) => handle<ChatResponse>(r));
}

interface StreamEvent {
  type: "delta" | "done" | "error";
  text?: string;
  reply?: string;
  flags?: string[];
  escalation?: Record<string, unknown> | null;
  detail?: string;
}

// Reads the newline-delimited JSON stream from POST /chat/stream, invoking onDelta as
// text chunks arrive and resolving with the final structured result once the server
// sends its "done" event. Network failures and mid-stream server errors both reject
// with ApiError so the caller can show one consistent error UI.
export async function streamChat(
  token: string,
  session_id: string,
  message: string,
  language: string,
  onDelta: (chunk: string) => void
): Promise<ChatResponse> {
  const res = await safeFetch(`${BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id, message, language }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail || `Request failed: ${res.status}`, "http");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event: StreamEvent = JSON.parse(line);
      if (event.type === "delta" && event.text) {
        onDelta(event.text);
      } else if (event.type === "done") {
        return { reply: event.reply ?? "", flags: event.flags ?? [], escalation: event.escalation ?? null };
      } else if (event.type === "error") {
        throw new ApiError(event.detail || "The assistant hit an error mid-reply.", "http");
      }
    }
  }

  throw new ApiError("The connection closed before the assistant finished replying.", "network");
}
