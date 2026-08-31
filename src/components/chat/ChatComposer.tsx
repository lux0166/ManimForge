"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatComposerProps = {
  suggestions?: string[];
  placeholder?: string;
  onSend: (text: string) => void;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  className?: string;
};

const DEFAULT_SUGGESTIONS = ["@scene", "@animate", "@math", "@color"];

export function ChatComposer({
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Prompt or tag with @",
  onSend,
  isGenerating = false,
  onStopGenerating,
  className,
}: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = draft.trim().length > 0;

  const handleSend = () => {
    if (isGenerating) {
      onStopGenerating?.();
      return;
    }
    if (!canSend) return;
    const text = draft.trim();
    onSend(text);
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleTagClick = (tag: string) => {
    setDraft((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [draft]);

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col rounded-xl bg-[#121214] border border-[#27272a] p-3 transition-all duration-150 focus-within:border-[#3f3f46] focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {/* Auto-expanding Input Area */}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none bg-transparent text-xs text-white placeholder:text-[#71717a] outline-none leading-relaxed min-h-[36px] max-h-[140px]"
      />

      {/* Bottom Bar: Tags on left, Send on right (NO divider lines) */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleTagClick(item)}
              className="rounded-md bg-[#18181b] border border-[#27272a] px-2 py-0.5 font-mono text-[11px] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline font-mono text-[10px] text-[#71717a]">
            Enter ↵
          </span>

          <button
            type="button"
            aria-label={isGenerating ? "Stop" : "Send"}
            disabled={!isGenerating && !canSend}
            onClick={handleSend}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg transition-all active:scale-95",
              isGenerating
                ? "bg-red-500 text-white"
                : canSend
                ? "bg-white text-black font-bold hover:bg-[#e4e4e7] shadow-sm"
                : "bg-[#18181b] text-[#71717a] opacity-40 pointer-events-none"
            )}
          >
            {isGenerating ? (
              <Square className="size-2.5 fill-current" />
            ) : (
              <ArrowUp className="size-3.5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatComposer;
