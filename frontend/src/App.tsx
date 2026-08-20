import { useState } from "react";
import Login from "./screens/Login";
import Chat from "./screens/Chat";
import type { LoginResponse } from "./api/client";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

export default function App() {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const { theme, toggle } = useTheme();

  return (
    <div className="app-shell" data-theme={theme}>
      {session ? (
        <Chat session={session} onLogout={() => setSession(null)} theme={theme} onToggleTheme={toggle} />
      ) : (
        <Login onLogin={setSession} theme={theme} onToggleTheme={toggle} />
      )}
    </div>
  );
}
