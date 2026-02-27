"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";

interface SkillsInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
  placeholder?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SkillsInput({
  value,
  onChange,
  maxSkills = 20,
  placeholder = "Type a skill and press Enter…",
}: SkillsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(inputValue.trim(), 200);

  // Fetch suggestions whenever debounced query changes
  useEffect(() => {
    let cancelled = false;
    async function fetchSuggestions() {
      try {
        const res = await fetch(
          `/api/skills?q=${encodeURIComponent(debouncedQuery)}&limit=8`
        );
        if (!res.ok) return;
        const data: { skills: string[] } = await res.json();
        if (cancelled) return;
        // Filter out already-selected skills (case-insensitive)
        const lower = new Set(value.map((s) => s.toLowerCase()));
        setSuggestions(data.skills.filter((s) => !lower.has(s.toLowerCase())));
        setOpen(data.skills.length > 0);
        setActiveIdx(-1);
      } catch {
        // silently ignore network errors in autocomplete
      }
    }
    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedQuery, value]);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function addSkill(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const lower = new Set(value.map((s) => s.toLowerCase()));
    if (lower.has(trimmed.toLowerCase())) return;
    if (value.length >= maxSkills) return;
    onChange([...value, trimmed]);
    setInputValue("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeSkill(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        addSkill(suggestions[activeIdx]);
      } else if (inputValue.trim()) {
        addSkill(inputValue);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeSkill(value.length - 1);
    }
  }

  const atMax = value.length >= maxSkills;

  return (
    <div ref={containerRef} className="relative">
      {/* Tag + input box */}
      <div
        className="min-h-[42px] w-full flex flex-wrap gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 cursor-text focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-shadow"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((skill, i) => (
          <span
            key={`${skill}-${i}`}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
          >
            {skill}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeSkill(i); }}
              className="flex-shrink-0 rounded hover:bg-primary/20 transition-colors p-0.5"
              aria-label={`Remove ${skill}`}
            >
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}

        {!atMax && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-slate-400 mt-1 flex justify-between">
        <span>Press <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs font-mono">Enter</kbd> or <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs font-mono">,</kbd> to add · <kbd className="px-1 py-0.5 rounded border border-slate-200 bg-slate-50 text-xs font-mono">⌫</kbd> to remove</span>
        <span>{value.length}/{maxSkills}</span>
      </p>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addSkill(s); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === activeIdx
                    ? "bg-primary text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {/* Bold the matching prefix */}
                {inputValue.trim()
                  ? highlightMatch(s, inputValue.trim())
                  : s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Wraps the matching prefix of `text` in a <strong>. */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}
