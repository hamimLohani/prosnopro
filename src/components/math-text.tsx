"use client";

import "katex/dist/katex.min.css";
import { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders plain text with inline/display KaTeX expressions (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`).
 */
export function MathText({ text, className = "" }: MathTextProps) {
  const parts = useMemo(() => {
    if (!text.includes("$") && !text.includes("\\(") && !text.includes("\\[")) {
      return [{ type: "text" as const, content: text }];
    }

    const segments: Array<{ type: "text" | "math"; content: string; displayMode?: boolean }> = [];
    const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      const token = match[0];
      const isDisplay = token.startsWith("$$") || token.startsWith("\\[");
      const expr =
        token.startsWith("$$") || token.startsWith("\\[") || token.startsWith("\\(")
          ? token.slice(2, -2)
          : token.slice(1, -1);
      segments.push({ type: "math", content: expr, displayMode: isDisplay });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ type: "text", content: text.slice(lastIndex) });
    }

    return segments;
  }, [text]);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.type === "text") {
          return <span key={idx}>{part.content}</span>;
        }
        try {
          const html = katex.renderToString(part.content, {
            displayMode: Boolean(part.displayMode),
            throwOnError: false,
            strict: false,
          });
          return (
            <span
              key={idx}
              className={part.displayMode ? "my-1 block max-w-full overflow-x-auto" : "inline"}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={idx}>{part.content}</span>;
        }
      })}
    </span>
  );
}
