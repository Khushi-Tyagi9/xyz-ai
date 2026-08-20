import Icon, { type IconName } from "./Icon";

export type AvatarState = "idle" | "listening" | "speaking";

const PERSONA_META: Record<string, { icon: IconName; gradient: string; solid: string }> = {
  student: { icon: "graduationCap", gradient: "var(--grad-student)", solid: "#33415c" },
  parent: { icon: "users", gradient: "var(--grad-parent)", solid: "#9c7530" },
  teacher: { icon: "pencil", gradient: "var(--grad-teacher)", solid: "#34594a" },
  principal: { icon: "building", gradient: "var(--grad-principal)", solid: "#493a5c" },
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
  const meta = PERSONA_META[role] ?? { icon: "messageCircle" as IconName, gradient: "var(--grad-student)", solid: "#33415c" };
  const badgeSize = Math.max(14, size * 0.34);

  return (
    <div
      className={`avatar avatar-${state}`}
      style={{ width: size, height: size, background: meta.gradient }}
    >
      <div className="avatar-face">
        <span className="avatar-eye avatar-eye-l" />
        <span className="avatar-eye avatar-eye-r" />
        <svg className="avatar-mouth" viewBox="0 0 40 20" aria-hidden>
          {state === "idle" && (
            <path d="M9 6.5 Q20 16 31 6.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
          )}
          {state !== "idle" && <ellipse className="avatar-mouth-o" cx="20" cy="10" rx="6" ry="7" fill="#fff" />}
        </svg>
      </div>

      {state === "listening" && (
        <span className="avatar-ring avatar-ring-listening" aria-hidden />
      )}

      <span
        className="avatar-role-badge"
        style={{ width: badgeSize, height: badgeSize, color: meta.solid }}
      >
        <Icon name={meta.icon} size={badgeSize * 0.6} strokeWidth={1.8} />
      </span>
    </div>
  );
}
