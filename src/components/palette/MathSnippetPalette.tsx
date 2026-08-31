"use client";

import React from "react";
import { Sparkles, Network, Activity, Box, Variable } from "lucide-react";
import { MATH_SNIPPETS, type MathSnippet } from "./types";
export { MATH_SNIPPETS, type MathSnippet };
import { cn } from "@/lib/utils";

export interface MathSnippetPaletteProps {
  onInsertSnippet: (snippet: MathSnippet) => void;
  onAskAgent: (prompt: string) => void;
  className?: string;
}

export function MathSnippetPalette({
  onInsertSnippet,
  onAskAgent,
  className,
}: MathSnippetPaletteProps) {
  return (
    <div className={cn("flex flex-col bg-[#121214] text-white p-4 space-y-3 overflow-y-auto", className)}>
      <div className="flex items-center justify-between border-b border-[#27272a] pb-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="size-4 text-white" />
          <span>Math & Science Animation Snippets</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {MATH_SNIPPETS.map((snippet) => {
          const Icon = snippet.icon;
          return (
            <div
              key={snippet.id}
              className="group flex flex-col rounded-xl bg-[#18181b] p-3 border border-[#27272a] hover:border-white transition-all space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-white/10 text-white">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="font-semibold text-xs text-white">{snippet.title}</div>
                    <div className="text-[10.5px] text-[#71717a]">{snippet.description}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onInsertSnippet(snippet)}
                  className="flex-1 rounded-lg bg-[#121214] hover:bg-[#27272a] py-1.5 text-[11px] font-medium text-white border border-[#27272a] transition-colors"
                >
                  Insert Code
                </button>
                <button
                  type="button"
                  onClick={() => onAskAgent(`Animate ${snippet.title} with high visual polish and step-by-step narration`)}
                  className="flex-1 rounded-lg bg-white hover:bg-[#e4e4e7] py-1.5 text-[11px] font-bold text-black transition-colors"
                >
                  Prompt AI
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
