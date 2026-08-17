export default function EscalationCard({ escalation }: { escalation: Record<string, unknown> }) {
  const kind = escalation.kind === "management_call" ? "School Management" : "Teacher";
  return (
    <div className="escalation-card">
      <div className="escalation-title">✅ Request submitted to {kind}</div>
      <div className="escalation-meta">
        Request ID: {String(escalation.request_id)} · Status: {String(escalation.status)}
      </div>
    </div>
  );
}
