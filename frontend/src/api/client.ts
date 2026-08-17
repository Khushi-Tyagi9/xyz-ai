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

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function listDemoUsers(): Promise<DemoUser[]> {
  return fetch(`${BASE_URL}/auth/demo-users`).then((r) => handle<DemoUser[]>(r));
}

export function login(user_id: string): Promise<LoginResponse> {
  return fetch(`${BASE_URL}/auth/login`, {
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
  return fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id, message, language }),
  }).then((r) => handle<ChatResponse>(r));
}
