import Avatar, { type AvatarState } from "./Avatar";

const PERSONA_META: Record<string, { title: string }> = {
  student: { title: "Academic Assistant" },
  parent: { title: "Parent Support Assistant" },
  teacher: { title: "Teaching Assistant" },
  principal: { title: "Management Assistant" },
};

export default function PersonaHeader({
  role,
  name,
  avatarState = "idle",
}: {
  role: string;
  name: string;
  avatarState?: AvatarState;
}) {
  const meta = PERSONA_META[role] ?? { title: "Assistant" };
  return (
    <header className="persona-header">
      <Avatar role={role} state={avatarState} size={44} />
      <div>
        <div className="persona-title">XYZ AI · {meta.title}</div>
        <div className="persona-subtitle">
          {name} · {role}
        </div>
      </div>
    </header>
  );
}
