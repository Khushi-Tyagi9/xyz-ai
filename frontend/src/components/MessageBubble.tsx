import { renderInlineMarkdown } from "../utils/markdown";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`bubble-row ${message.role}`}>
      <div className={`bubble ${message.role}`}>{renderInlineMarkdown(message.text)}</div>
    </div>
  );
}
