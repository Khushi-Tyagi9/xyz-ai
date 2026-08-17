export type AvatarState = "idle" | "listening" | "speaking";

const PERSONA_META: Record<string, { emoji: string; gradient: string }> = {
  student: { emoji: "🎓", gradient: "var(--grad-student)" },
  parent: { emoji: "💛", gradient: "var(--grad-parent)" },
  teacher: { emoji: "🧑‍🏫", gradient: "var(--grad-teacher)" },
  principal: { emoji: "🏫", gradient: "var(--grad-principal)" },
};

export default function Avatar({
  role,
  state = "idle",
  size = 56,
}: {
  role: string;
  state?: AvatarState;
  size?: number;
}) {
  const meta = PERSONA_META[role] ?? { emoji: "🤖", gradient: "var(--grad-student)" };

  return (
    <div
      className={`avatar avatar-${state}`}
      style={{ width: size, height: size, background: meta.gradient, fontSize: size * 0.5 }}
    >
      <span className="avatar-emoji">{meta.emoji}</span>
      {state === "listening" && (
        <span className="avatar-ring avatar-ring-listening" aria-hidden />
      )}
      {state === "speaking" && (
        <span className="avatar-bars" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
