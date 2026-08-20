import { useEffect, useRef, useState, type CSSProperties } from "react";
import { streamChat, ApiError, type LoginResponse } from "../api/client";
import PersonaHeader from "../components/PersonaHeader";
import AvatarStage from "../components/AvatarStage";
import MessageBubble, { type ChatMessage } from "../components/MessageBubble";
import EscalationCard from "../components/EscalationCard";
import Icon from "../components/Icon";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { LANGUAGES, bcp47For } from "../utils/languages";

interface Turn {
  id: string;
  message: ChatMessage;
  escalation?: Record<string, unknown> | null;
}

interface ChatProps {
  session: LoginResponse;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

function newId() {
  return crypto.randomUUID();
}

export default function Chat({ session, onLogout, theme, onToggleTheme }: ChatProps) {
  const sessionId = useRef(crypto.randomUUID());
  const [language, setLanguage] = useState("English");
  const [input, setInput] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: newId(),
      message: {
        role: "assistant",
        text: `Hi ${session.name.split(" ")[0]}, I'm XYZ AI. How can I help you today?`,
      },
    },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { speak, speaking, supported: ttsSupported } = useSpeechSynthesis();

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userTurnId = newId();
    const assistantTurnId = newId();

    // Both turns are added in a single update so the user's own message can never be
    // lost or overwritten by a later delta update racing against a separate "add user
    // turn" update - every subsequent change targets the assistant turn by its own id.
    setTurns((t) => [
      ...t,
      { id: userTurnId, message: { role: "user", text: trimmed } },
      { id: assistantTurnId, message: { role: "assistant", text: "" } },
    ]);
    setInput("");
    setSending(true);
    setError(null);
    setLastFailedMessage(null);

    let streamedText = "";
    let gotFirstDelta = false;

    try {
      const res = await streamChat(session.token, sessionId.current, trimmed, language, (chunk) => {
        streamedText += chunk;
        gotFirstDelta = true;
        setSending(false);
        setTurns((t) =>
          t.map((turn) =>
            turn.id === assistantTurnId ? { ...turn, message: { role: "assistant", text: streamedText } } : turn
          )
        );
      });

      setTurns((t) =>
        t.map((turn) =>
          turn.id === assistantTurnId
            ? { id: assistantTurnId, message: { role: "assistant", text: res.reply }, escalation: res.escalation }
            : turn
        )
      );
      if (voiceReplies) speak(res.reply, bcp47For(language));
    } catch (e) {
      const apiError = e instanceof ApiError ? e : null;
      // Drop the empty placeholder bubble if nothing ever streamed into it.
      if (!gotFirstDelta) {
        setTurns((t) => t.filter((turn) => turn.id !== assistantTurnId));
      }
      setError({
        message: apiError?.message ?? (e instanceof Error ? e.message : String(e)),
        retryable: !gotFirstDelta,
      });
      if (!gotFirstDelta) setLastFailedMessage(trimmed);
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
              <Icon name={voiceReplies ? "volume" : "volumeOff"} size={16} />
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
            <Icon name={theme === "light" ? "moon" : "sun"} size={16} />
          </button>
        </div>
      </div>

      <AvatarStage role={session.role} name={session.name} state={avatarState} />

      <div className="chat-messages">
        {turns.map((t) => (
          <div key={t.id}>
            {t.message.text && <MessageBubble message={t.message} />}
            {t.escalation && <EscalationCard escalation={t.escalation} />}
          </div>
        ))}
        {sending && (
          <div className="typing-indicator">
            <span className="typing-dots"><i /><i /><i /></span> XYZ AI is typing
          </div>
        )}
        {error && (
          <div className="error-banner error-banner-actions">
            <span>{error.message}</span>
            {error.retryable && lastFailedMessage && (
              <button type="button" className="error-retry-btn" onClick={() => send(lastFailedMessage)}>
                Retry
              </button>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showEscalationShortcuts && (
        <div className="escalation-shortcuts">
          <button onClick={() => send("I'd like to talk to my teacher about something.")}>
            <Icon name="pencil" size={14} /> Talk to Teacher
          </button>
          <button onClick={() => send("I'd like to contact school management.")}>
            <Icon name="building" size={14} /> Contact School Management
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
            <Icon name={listening ? "stop" : "mic"} size={17} />
          </button>
        )}
        <input
          value={listening ? interimTranscript || "Listening…" : input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending || listening}
        />
        <button type="submit" disabled={sending || listening || !input.trim()}>
          Send <Icon name="arrowRight" size={15} />
        </button>
      </form>
    </div>
  );
}
