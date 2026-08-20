import type { ReactNode } from "react";

// Minimal markdown renderer: **bold**, *italic*, "- " bullet lists, and a defensive
// fallback that flattens markdown tables (the model is instructed to avoid them, but
// this keeps a stray one from rendering as broken pipe/dash text). No dependency.
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(key: string) {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={key} className="bubble-list">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line, i) => {
    // Defensive fallback: the model is instructed not to use markdown tables in a chat
    // bubble, but if one slips through, drop the "|---|---|" separator row entirely
    // (it renders as a meaningless row of dashes) and flatten data rows to plain text.
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-")) {
      return;
    }
    const tableRowMatch = line.match(/^\s*\|(.+)\|\s*$/);
    const effectiveLine = tableRowMatch
      ? tableRowMatch[1].split("|").map((cell) => cell.trim()).filter(Boolean).join(" · ")
      : line;

    const bulletMatch = effectiveLine.match(/^\s*[-*]\s+(.*)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }
    flushList(`list-${i}`);
    if (effectiveLine.trim() === "") {
      blocks.push(<br key={`br-${i}`} />);
    } else {
      blocks.push(<span key={`line-${i}`}>{renderInline(effectiveLine)}</span>);
      if (i < lines.length - 1) blocks.push(<br key={`nl-${i}`} />);
    }
  });
  flushList("list-end");

  return blocks;
}
