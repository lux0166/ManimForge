"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AgentActivityItem } from "./agent-activity/types";

export type ThinkingVariant = "Steps" | "Reasoning" | "Search" | "Coding";

export type ThinkingRow = {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};

export interface ThinkingStateProps {
  variant?: ThinkingVariant;
  items?: AgentActivityItem[];
  isStreaming?: boolean;
  duration?: number;
  defaultOpen?: boolean;
  onSettled?: () => void;
  className?: string;
}

const DEFAULT_VARIANTS: Record<
  ThinkingVariant,
  { active: string; done: string; rows: ThinkingRow[]; query?: string }
> = {
  Steps: {
    active: "Thinking",
    done: "Thought for 4 seconds",
    rows: [
      { primary: "Reading scene AST & parameters" },
      { primary: "Formulating neural network geometry" },
      { primary: "Synthesizing Manim Community v0.21 animations", secondary: "scene.py" },
      { primary: "Executing compiler with FFmpeg" },
    ],
  },
  Reasoning: {
    active: "Thinking",
    done: "Reasoning completed",
    rows: [
      { primary: "Analyzing neural network error surface and gradient descent path." },
      { primary: "Configuring parameter tokens and compiling scene smoothly." },
    ],
  },
  Search: {
    active: "Searching Manim docs",
    done: "Searched documentation",
    query: "Manim Community v0.21 NeuralNetwork",
    rows: [
      { primary: "Manim Community Docs", secondary: "docs.manim.community", href: "https://docs.manim.community" },
      { primary: "3Blue1Brown Geometry", secondary: "3blue1brown.com", href: "https://www.3blue1brown.com" },
    ],
  },
  Coding: {
    active: "Running tools",
    done: "Ran 3 tools",
    rows: [
      { primary: "Read", secondary: "scene.py", mono: true },
      { primary: "Edit", secondary: "scene.py", mono: true, add: 48, del: 12 },
      { primary: "Run", secondary: "manim -qh scene.py", mono: true },
    ],
  },
};

function Dot({ tone }: { tone: string }) {
  return (
    <span className={`flex size-3.5 shrink-0 items-center justify-center rounded-full text-white ${tone}`}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    </span>
  );
}

const TONES = ["bg-white/30", "bg-emerald-500/80", "bg-sky-500/80"];

export function ThinkingState({
  variant = "Steps",
  items,
  isStreaming = false,
  duration = 3.2,
  defaultOpen = true,
  onSettled,
  className = "",
}: ThinkingStateProps) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(defaultOpen);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const v = DEFAULT_VARIANTS[variant] ?? DEFAULT_VARIANTS.Steps;
  
  const expanded = manualExpanded ?? true;
  const working = isStreaming;
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  // Convert real items if provided
  const rows: ThinkingRow[] = items && items.length > 0
    ? items.map((it) => {
        if (it.type === "step") {
          return { primary: it.label, secondary: it.meta };
        }
        if (it.type === "tool") {
          return { primary: it.action.toUpperCase(), secondary: it.target, mono: true, add: it.additions, del: it.deletions };
        }
        if (it.type === "text") {
          return { primary: it.content };
        }
        return { primary: "Agent Task", secondary: "active" };
      })
    : v.rows;

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [expanded, variant, items]);

  const settledRef = useRef(false);
  useEffect(() => {
    if (working || settledRef.current) return;
    settledRef.current = true;
    onSettled?.();
  }, [working, onSettled]);

  return (
    <div
      className={`flex w-full flex-col ${className}`}
      style={{
        transition: "min-height 400ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {/* Header — shared across variants */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !current)}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-control px-1.5 py-1 transition-colors duration-100 hover:bg-hover-2 cursor-pointer outline-none"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={working ? "var(--ink-2)" : "var(--ink-3)"}>
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>
        <span role="status" className="contents">
          {working ? (
            <span
              className="bg-clip-text text-[12.5px] font-medium whitespace-nowrap text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              {v.active}
            </span>
          ) : (
            <span
              className="text-[12.5px] font-medium whitespace-nowrap text-ink-2"
              style={{ animation: "fade-in 350ms ease-out both" }}
            >
              {items && items.length > 0 ? `Completed ${items.length} steps` : `Thought for ${duration}s`}
            </span>
          )}
        </span>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-300"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expandable Trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-400"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-3.5">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{ top: -4, height: lineHeight ? lineHeight : 0, transition: "height 500ms cubic-bezier(0.23,1,0.32,1)" }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {v.query && (
                <div className="flex h-6 items-center gap-2 px-1.5" style={{ animation: expanded ? "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" : undefined }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  <span className="text-[12px] text-ink-2 font-mono truncate">{v.query}</span>
                </div>
              )}
              {rows.map((row, i) => {
                const content = (
                  <>
                    {variant === "Search" && <Dot tone={TONES[i % 3]} />}
                    {variant === "Steps" && (
                      !working || i < rows.length - 1 ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span className="size-3 shrink-0 rounded-full border-[1.5px] border-line-strong border-t-ink-2" style={{ animation: "spin 700ms linear infinite" }} />
                      )
                    )}
                    {variant === "Coding" && (
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-white/90 bg-[#18181b] px-1.5 py-0.5 rounded border border-[#27272a]">
                        {row.primary}
                      </span>
                    )}
                    <span className={`min-w-0 truncate text-[12.5px] ${variant === "Reasoning" ? "whitespace-normal leading-relaxed text-ink-2" : "font-medium text-ink"}`}>
                      {variant === "Coding" ? "" : row.primary}
                    </span>
                    {row.secondary && (
                      <span className={`shrink-0 text-[11.5px] text-ink-3 truncate max-w-[280px] ${row.mono ? "font-mono text-[11px]" : ""}`}>
                        {row.secondary}
                      </span>
                    )}
                    {row.add !== undefined && (
                      <span className="shrink-0 font-mono text-[11px] tabular-nums">
                        <span className="text-green">+{row.add}</span>{" "}
                        <span className="text-red">−{row.del}</span>
                      </span>
                    )}
                  </>
                );
                const rowClass = "flex min-h-6.5 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left";
                const animation = { animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both` };

                if (variant === "Search" && row.href) {
                  return (
                    <a
                      key={`${row.primary}-${i}`}
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`${rowClass} transition-colors duration-150 hover:bg-hover`}
                      style={animation}
                    >
                      {content}
                    </a>
                  );
                }

                if (variant === "Coding") {
                  const toolKey = typeof row.primary === "string" ? row.primary : String(i);
                  const selected = selectedTool === toolKey;
                  return (
                    <button
                      key={`${toolKey}-${i}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTool(selected ? null : toolKey)}
                      className={`${rowClass} transition-colors duration-150 ${selected ? "bg-inset" : "hover:bg-hover"} cursor-pointer`}
                      style={animation}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={`${row.primary}-${i}`} className={rowClass} style={animation}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThinkingState;
