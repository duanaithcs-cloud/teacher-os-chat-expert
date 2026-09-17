"use client";

/**
 * MarkdownRenderer — render văn bản phản hồi không cần thư viện ngoài.
 * Hỗ trợ: **bold**, xuống dòng, bullet (-/•), numbered list, highlight số liệu.
 */

import React from "react";

function highlightNumbers(line: string): React.ReactNode[] {
  // Match: số có dấu phẩy/chấm phân cách thập phân, hoặc số kèm đơn vị %
  const NUMBER_RE = /(\d+[.,]\d+|\d+(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?\s*%?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = NUMBER_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-semibold text-indigo-700">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
}

function parseBold(text: string): React.ReactNode[] {
  const BOLD_RE = /\*\*(.+?)\*\*/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = BOLD_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...highlightNumbers(text.slice(lastIndex, match.index)));
    }
    nodes.push(
      <strong key={match.index}>{highlightNumbers(match[1])}</strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(...highlightNumbers(text.slice(lastIndex)));
  }
  return nodes;
}

function isBullet(line: string): boolean {
  return /^[-•]\s/.test(line.trimStart());
}

function isNumbered(line: string): boolean {
  return /^\d+[.)]\s/.test(line.trimStart());
}

export default function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    // Bullet list
    if (isBullet(line)) {
      const listItems: string[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        listItems.push(lines[i].trimStart().replace(/^[-•]\s*/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc pl-5 mb-3 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{parseBold(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (isNumbered(line)) {
      const listItems: string[] = [];
      while (i < lines.length && isNumbered(lines[i])) {
        listItems.push(lines[i].trimStart().replace(/^\d+[.)]\s*/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="list-decimal pl-5 mb-3 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{parseBold(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Heading (###)
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#{1,3})/)![1].length;
      const text = line.replace(/^#{1,3}\s*/, "");
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      elements.push(
        <Tag key={key++} className={`font-bold mb-2 mt-3 text-indigo-900 ${level === 1 ? "text-lg" : level === 2 ? "text-base" : "text-sm"}`}>
          {parseBold(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="mb-2 leading-relaxed">
        {parseBold(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}