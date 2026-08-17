const PERSONA_META: Record<string, { emoji: string; title: string }> = {
  student: { emoji: "🎓", title: "Academic Assistant" },
  parent: { emoji: "💛", title: "Parent Support Assistant" },
  teacher: { emoji: "🧑‍🏫", title: "Teaching Assistant" },
  principal: { emoji: "🏫", title: "Management Assistant" },
};

export default function PersonaHeader({ role, name }: { role: string; name: string }) {
  const meta = PERSONA_META[role] ?? { emoji: "🤖", title: "Assistant" };
  return (
    <header className="persona-header">
      <span className="persona-avatar" aria-hidden>
        {meta.emoji}
      </span>
      <div>
        <div className="persona-title">XYZ AI · {meta.title}</div>
        <div className="persona-subtitle">
          Signed in as {name} ({role})
        </div>
      </div>
    </header>
  );
}
