import { useRef, useState } from "react";
import { sendChat, type LoginResponse } from "../api/client";
import PersonaHeader from "../components/PersonaHeader";
import MessageBubble, { type ChatMessage } from "../components/MessageBubble";
import EscalationCard from "../components/EscalationCard";

const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Kannada",
  "Malayalam",
  "Urdu",
];

interface Turn {
  message: ChatMessage;
  escalation?: Record<string, unknown> | null;
}

export default function Chat({ session, onLogout }: { session: LoginResponse; onLogout: () => void }) {
  const sessionId = useRef(crypto.randomUUID());
  const [language, setLanguage] = useState("English");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    {
      message: {
        role: "assistant",
        text: `Hi ${session.name.split(" ")[0]}, I'm XYZ AI. How can I help you today?`,
      },
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setTurns((t) => [...t, { message: { role: "user", text: trimmed } }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await sendChat(session.token, sessionId.current, trimmed, language);
      setTurns((t) => [
        ...t,
        { message: { role: "assistant", text: res.reply }, escalation: res.escalation },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const showEscalationShortcuts = session.role === "student" || session.role === "parent";

  return (
    <div className="chat-screen">
      <div className="chat-topbar">
        <PersonaHeader role={session.role} name={session.name} />
        <div className="topbar-actions">
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button className="logout-btn" onClick={onLogout}>
            Switch user
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {turns.map((t, i) => (
          <div key={i}>
            <MessageBubble message={t.message} />
            {t.escalation && <EscalationCard escalation={t.escalation} />}
          </div>
        ))}
        {sending && <div className="typing-indicator">XYZ AI is typing…</div>}
        {error && <div className="error-banner">{error}</div>}
      </div>

      {showEscalationShortcuts && (
        <div className="escalation-shortcuts">
          <button onClick={() => send("I'd like to talk to my teacher about something.")}>
            Talk to Teacher
          </button>
          <button onClick={() => send("I'd like to contact school management.")}>
            Contact School Management
          </button>
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
