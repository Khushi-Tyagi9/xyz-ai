import Avatar, { type AvatarState } from "./Avatar";

const STATE_LABEL: Record<AvatarState, string> = {
  idle: "Ready to help",
  listening: "Listening…",
  speaking: "Speaking…",
};

const PERSONA_TITLE: Record<string, string> = {
  student: "Academic Assistant",
  parent: "Parent Support Assistant",
  teacher: "Teaching Assistant",
  principal: "Management Assistant",
};

export default function AvatarStage({ role, name, state }: { role: string; name: string; state: AvatarState }) {
  return (
    <div className="avatar-stage">
      <Avatar role={role} state={state} size={84} />
      <div className="avatar-stage-title">{PERSONA_TITLE[role] ?? "Assistant"}</div>
      <div className={`avatar-stage-state avatar-stage-state-${state}`}>{STATE_LABEL[state]}</div>
      <div className="avatar-stage-name">for {name}</div>
    </div>
  );
}
