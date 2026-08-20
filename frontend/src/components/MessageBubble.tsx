import { renderMarkdown } from "../utils/markdown";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`bubble-row ${message.role}`}>
      <div className={`bubble ${message.role}`}>{renderMarkdown(message.text)}</div>
    </div>
  );
}
