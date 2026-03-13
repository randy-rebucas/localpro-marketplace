"use client";

import { useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

interface MdEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
  id?: string;
  error?: boolean;
}

type ToolbarAction = {
  icon: React.ReactNode;
  title: string;
  wrap?: [string, string];
  line?: string;
};

const TOOLBAR: ToolbarAction[] = [
  { icon: <Bold className="h-3.5 w-3.5" />,        title: "Bold",          wrap: ["**", "**"] },
  { icon: <Italic className="h-3.5 w-3.5" />,      title: "Italic",        wrap: ["_", "_"] },
  { icon: <List className="h-3.5 w-3.5" />,        title: "Bullet list",   line: "- " },
  { icon: <ListOrdered className="h-3.5 w-3.5" />, title: "Numbered list", line: "1. " },
];

export default function MdEditor({
  value,
  onChange,
  placeholder = "Write with **markdown** support…",
  rows = 4,
  required,
  minLength,
  id,
  error,
}: MdEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function applyToolbar(action: ToolbarAction) {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = value.slice(start, end);
    let next    = value;
    let cursor  = start;

    if (action.wrap) {
      const [before, after] = action.wrap;
      next   = value.slice(0, start) + before + sel + after + value.slice(end);
      cursor = start + before.length + sel.length + after.length;
    } else if (action.line) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      next   = value.slice(0, lineStart) + action.line + value.slice(lineStart);
      cursor = start + action.line.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className={`mt-1 rounded-lg border focus-within:ring-1 transition overflow-hidden ${
      error
        ? "border-red-400 focus-within:ring-red-200"
        : "border-slate-200 focus-within:ring-blue-400"
    }`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {TOOLBAR.map((action) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              onClick={() => applyToolbar(action)}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {action.icon}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-300 pr-1 select-none">Markdown</span>
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-0 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-0 resize-y bg-white font-mono leading-relaxed"
      />
    </div>
  );
}
