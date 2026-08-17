import { useEffect, useState } from "react";
import { listDemoUsers, login, type DemoUser, type LoginResponse } from "../api/client";

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  teacher: "Teacher",
  principal: "Principal",
};

export default function Login({ onLogin }: { onLogin: (session: LoginResponse) => void }) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    listDemoUsers()
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  async function handlePick(userId: string) {
    setError(null);
    setLoadingId(userId);
    try {
      const session = await login(userId);
      onLogin(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingId(null);
    }
  }

  const grouped = users.reduce<Record<string, DemoUser[]>>((acc, u) => {
    (acc[u.role] ??= []).push(u);
    return acc;
  }, {});

  return (
    <div className="login-screen">
      <h1>XYZ AI</h1>
      <p className="login-subtitle">Human-like school assistant — pick a demo identity to sign in.</p>
      {error && <div className="error-banner">{error}</div>}
      <div className="role-groups">
        {Object.entries(grouped).map(([role, list]) => (
          <div key={role} className="role-group">
            <h2>{ROLE_LABELS[role] ?? role}</h2>
            {list.map((u) => (
              <button
                key={u.user_id}
                className="user-pick-btn"
                disabled={loadingId === u.user_id}
                onClick={() => handlePick(u.user_id)}
              >
                {loadingId === u.user_id ? "Signing in…" : u.name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
