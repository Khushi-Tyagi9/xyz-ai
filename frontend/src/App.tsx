import { useState } from "react";
import Landing from "./screens/Landing";
import Login from "./screens/Login";
import Chat from "./screens/Chat";
import type { LoginResponse } from "./api/client";
import { useTheme } from "./hooks/useTheme";
import "./App.css";

export default function App() {
  const [showApp, setShowApp] = useState(false);
  const [session, setSession] = useState<LoginResponse | null>(null);
  const { theme, toggle } = useTheme();

  if (!showApp) {
    return (
      <div data-theme={theme} className="root-shell">
        <Landing onGetStarted={() => setShowApp(true)} theme={theme} onToggleTheme={toggle} />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="root-shell">
      <div className="app-shell">
        {session ? (
          <Chat session={session} onLogout={() => setSession(null)} theme={theme} onToggleTheme={toggle} />
        ) : (
          <Login
            onLogin={setSession}
            onBack={() => setShowApp(false)}
            theme={theme}
            onToggleTheme={toggle}
          />
        )}
      </div>
    </div>
  );
}
