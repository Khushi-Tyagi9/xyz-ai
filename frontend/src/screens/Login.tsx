import { useEffect, useState } from "react";
import { listDemoUsers, login, type DemoUser, type LoginResponse } from "../api/client";
import Avatar from "../components/Avatar";

const ROLE_META: Record<string, { label: string; blurb: string }> = {
  student: { label: "Student", blurb: "Check your own attendance & more" },
  parent: { label: "Parent", blurb: "Stay on top of your child's progress" },
  teacher: { label: "Teacher", blurb: "Manage attendance for your class" },
  principal: { label: "Principal", blurb: "School-wide analytics at a glance" },
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
      <div className="login-hero">
        <div className="login-mark">XYZ</div>
        <h1>XYZ AI</h1>
        <p className="login-subtitle">Your human-like school assistant — chat, voice, and avatar, in one place.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="role-groups">
        {Object.entries(grouped).map(([role, list]) => (
          <div key={role} className="role-group">
            <div className="role-group-heading">
              <Avatar role={role} size={30} />
              <div>
                <div className="role-group-label">{ROLE_META[role]?.label ?? role}</div>
                <div className="role-group-blurb">{ROLE_META[role]?.blurb}</div>
              </div>
            </div>
            {list.map((u) => (
              <button
                key={u.user_id}
                className="user-pick-btn"
                disabled={loadingId === u.user_id}
                onClick={() => handlePick(u.user_id)}
              >
                {loadingId === u.user_id ? "Signing in…" : u.name}
                <span className="user-pick-arrow">→</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
