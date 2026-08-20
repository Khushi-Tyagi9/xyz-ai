import { useEffect, useRef, useState, type CSSProperties } from "react";
import { sendChat, type LoginResponse } from "../api/client";
import PersonaHeader from "../components/PersonaHeader";
import AvatarStage from "../components/AvatarStage";
import MessageBubble, { type ChatMessage } from "../components/MessageBubble";
import EscalationCard from "../components/EscalationCard";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { LANGUAGES, bcp47For } from "../utils/languages";

interface Turn {
  message: ChatMessage;
  escalation?: Record<string, unknown> | null;
}

interface ChatProps {
  session: LoginResponse;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Chat({ session, onLogout, theme, onToggleTheme }: ChatProps) {
  const sessionId = useRef(crypto.randomUUID());
  const [language, setLanguage] = useState("English");
  const [input, setInput] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { speak, speaking, supported: ttsSupported } = useSpeechSynthesis();

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
      if (voiceReplies) speak(res.reply, bcp47For(language));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const {
    listening,
    interimTranscript,
    supported: sttSupported,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({
    lang: bcp47For(language),
    onFinalResult: (transcript) => send(transcript),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, sending]);

  const avatarState = listening ? "listening" : speaking ? "speaking" : "idle";
  const showEscalationShortcuts = session.role === "student" || session.role === "parent";
  const roleGradVar = `var(--grad-${["student", "parent", "teacher", "principal"].includes(session.role) ? session.role : "student"})`;

  return (
    <div className="chat-screen" style={{ "--role-grad": roleGradVar } as CSSProperties}>
      <div className="chat-topbar">
        <PersonaHeader role={session.role} name={session.name} avatarState={avatarState} />
        <div className="topbar-actions">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
            {LANGUAGES.map((lang) => (
              <option key={lang.name} value={lang.name}>
                {lang.name}
              </option>
            ))}
          </select>
          {ttsSupported && (
            <button
              className={`icon-toggle ${voiceReplies ? "active" : ""}`}
              onClick={() => setVoiceReplies((v) => !v)}
              title={voiceReplies ? "Voice replies on" : "Voice replies off"}
            >
              {voiceReplies ? "🔊" : "🔈"}
            </button>
          )}
          <button className="logout-btn" onClick={onLogout}>
            Switch user
          </button>
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      <AvatarStage role={session.role} name={session.name} state={avatarState} />

      <div className="chat-messages">
        {turns.map((t, i) => (
          <div key={i}>
            <MessageBubble message={t.message} />
            {t.escalation && <EscalationCard escalation={t.escalation} />}
          </div>
        ))}
        {sending && (
          <div className="typing-indicator">
            <span className="typing-dots"><i /><i /><i /></span> XYZ AI is typing
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {showEscalationShortcuts && (
        <div className="escalation-shortcuts">
          <button onClick={() => send("I'd like to talk to my teacher about something.")}>
            👩‍🏫 Talk to Teacher
          </button>
          <button onClick={() => send("I'd like to contact school management.")}>
            🏫 Contact School Management
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
        {sttSupported && (
          <button
            type="button"
            className={`mic-btn ${listening ? "listening" : ""}`}
            onClick={() => (listening ? stopListening() : startListening())}
            title={listening ? "Stop listening" : "Speak your message"}
          >
            {listening ? "⏹" : "🎤"}
          </button>
        )}
        <input
          value={listening ? interimTranscript || "Listening…" : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending || listening}
        />
        <button type="submit" disabled={sending || listening || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
