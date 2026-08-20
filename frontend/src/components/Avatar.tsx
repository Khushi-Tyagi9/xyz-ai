import Icon, { type IconName } from "./Icon";

export type AvatarState = "idle" | "listening" | "speaking";

const PERSONA_META: Record<string, { icon: IconName; gradient: string }> = {
  student: { icon: "graduationCap", gradient: "var(--grad-student)" },
  parent: { icon: "users", gradient: "var(--grad-parent)" },
  teacher: { icon: "pencil", gradient: "var(--grad-teacher)" },
  principal: { icon: "building", gradient: "var(--grad-principal)" },
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
  const meta = PERSONA_META[role] ?? { icon: "messageCircle" as IconName, gradient: "var(--grad-student)" };

  return (
    <div
      className={`avatar avatar-${state}`}
      style={{ width: size, height: size, background: meta.gradient }}
    >
      <Icon name={meta.icon} size={size * 0.46} strokeWidth={1.6} className="avatar-icon" />
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
