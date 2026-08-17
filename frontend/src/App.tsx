import { useState } from "react";
import Login from "./screens/Login";
import Chat from "./screens/Chat";
import type { LoginResponse } from "./api/client";
import "./App.css";

export default function App() {
  const [session, setSession] = useState<LoginResponse | null>(null);

  return (
    <div className="app-shell">
      {session ? (
        <Chat session={session} onLogout={() => setSession(null)} />
      ) : (
        <Login onLogin={setSession} />
      )}
    </div>
  );
}
