"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createShader, playSweep, accentChain, ACCENTS } from "glimm";
import type { AgentCliInfo } from "@/lib/tauri-bridge";

const RAINBOW = accentChain([
  ACCENTS.red,
  ACCENTS.orange,
  ACCENTS.yellow,
  ACCENTS.green,
  ACCENTS.cyan,
  ACCENTS.blue,
  ACCENTS.purple,
]);

function Icon({ children, size = 15, strokeWidth = 1.8 }: { children: React.ReactNode; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPHS: Record<string, React.ReactNode> = {
  clip: <path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  layers: <g><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></g>,
  globe: <g><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></g>,
};

type Source = {
  key: string;
  name: string;
  desc: string;
  glyph?: string;
  attach?: boolean;
};

const SOURCES: Source[] = [
  { key: "attach", name: "Add media & assets", desc: "Upload SVG/PNG from computer", glyph: "clip", attach: true },
  { key: "scene", name: "@scene.py", desc: "Current Monaco editor code", glyph: "layers" },
  { key: "vars", name: "@variables", desc: "Live parameter inspector tokens", glyph: "chart" },
  { key: "manim", name: "@manim-docs", desc: "Manim Community v0.21 mobjects", glyph: "globe" },
];

const COMMANDS = [
  { key: "render", name: "/render", desc: "Re-render scene with Manim engine" },
  { key: "fix", name: "/fix", desc: "Auto-fix Python & syntax errors" },
  { key: "optimize", name: "/optimize", desc: "Tune animations for 60fps pacing" },
  { key: "export", name: "/export", desc: "Open Export & Master video modal" },
  { key: "clear", name: "/clear", desc: "Clear chat timeline stream" },
];

export interface PromptBarProps {
  variant?: "Rounded" | "Pill";
  tall?: boolean;
  placeholder?: string;
  onSend?: (text: string, modelId?: string, planMode?: boolean) => void;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  availableAgents?: AgentCliInfo[];
}

function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}

export function PromptBar({
  variant = "Rounded",
  tall = false,
  placeholder,
  onSend,
  isGenerating = false,
  onStopGenerating,
  selectedModel = "agy",
  onModelChange,
  availableAgents,
}: PromptBarProps) {
  const pill = variant === "Pill";
  const [draft, setDraft] = useState("");
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [listening, setListening] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const wide = expanded || tall;
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [modelBox, setModelBox] = useState<{ top: number; height: number } | null>(null);
  const [modelHovered, setModelHovered] = useState<number | null>(null);
  const [modelMenuLeft, setModelMenuLeft] = useState(0);
  const [modelMenuBottom, setModelMenuBottom] = useState(0);
  
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const modelRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modelRowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const glimmRef = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef<ReturnType<typeof createShader> | null>(null);
  const sweepingRef = useRef(false);

  const modelsList = availableAgents && availableAgents.length > 0 ? availableAgents : [
    { id: "agy", name: "Antigravity CLI", command: "agy", installed: true, path: "agy", description: "DeepMind Autonomous Coding Agent" },
    { id: "opencode", name: "OpenCode CLI", command: "opencode", installed: true, path: "opencode", description: "Open-source terminal agent" },
    { id: "cline", name: "Cline CLI", command: "cline", installed: true, path: "cline", description: "Autonomous CLI developer" },
  ];

  const currentModel = modelsList.find((m) => m.id === selectedModel) || modelsList[0];

  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";

  const rows =
    menu === "at"
      ? SOURCES.filter((s) => s.name.toLowerCase().includes(query))
      : menu === "slash"
        ? COMMANDS.filter((c) => c.name.slice(1).startsWith(query))
        : [];

  useEffect(() => {
    setActive(0);
    setEngaged(false);
  }, [menu, query]);

  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, rows.length]);

  const modelIndex = modelsList.findIndex((m) => m.id === currentModel.id);
  useLayoutEffect(() => {
    if (!modelOpen) return;
    const target = modelRowRefs.current[modelHovered ?? modelIndex];
    if (target) setModelBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [modelOpen, modelHovered, modelIndex]);

  useLayoutEffect(() => {
    if (!modelOpen || !composerAnchorRef.current || !modelRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = modelRef.current.getBoundingClientRect();
    setModelMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 220)));
    setModelMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [modelOpen, wide, currentModel.command]);

  useEffect(() => {
    if (!modelOpen) setModelHovered(null);
  }, [modelOpen]);

  const makeShader = () => {
    const canvas = glimmRef.current;
    if (!canvas) return null;
    const random = Math.random;
    Math.random = () => 0;
    try {
      return createShader({
        canvas,
        palette: RAINBOW,
        direction: "ltr",
        bandTight: 10,
        swellAmount: 0.85,
      });
    } finally {
      Math.random = random;
    }
  };

  useEffect(() => {
    shaderRef.current = makeShader();
    return () => {
      shaderRef.current?.destroy();
      shaderRef.current = null;
    };
  }, []);

  const celebrate = () => {
    if (sweepingRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    shaderRef.current?.destroy();
    const shader = makeShader();
    shaderRef.current = shader;
    if (!shader) return;
    sweepingRef.current = true;
    const sweep = playSweep(shader, {
      palette: RAINBOW,
      direction: "ltr",
      sweepMs: 570,
      outroMs: 80,
      peakAlpha: 1.3,
      bandTight: 10,
      brightness: 1.4,
      swellAmount: 1,
      waveSpeed: 1.8,
      easing: "easeOutExpo",
    });
    sweep.done.finally(() => {
      sweepingRef.current = false;
    });
  };

  const selectModel = (next: AgentCliInfo) => {
    onModelChange?.(next.id);
    setModelOpen(false);
    celebrate();
  };

  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const modelButton = modelRef.current;
    if (!input || !controls || !measure || !modelButton) return;

    const fixedControlsWidth = 28 * 3 + modelButton.offsetWidth;
    const inlineGaps = 4 * 4;
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth = draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) {
      setExpanded(needsFullWidth);
    }

    const minHeight = 28;
    const maxHeight = 120;
    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`;
    input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, [draft, expanded]);

  useEffect(() => {
    if (!modelOpen && !plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) {
        setModelOpen(false);
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [modelOpen, plusOpen]);

  const closeMenus = () => {
    setPlusOpen(false);
    setModelOpen(false);
  };

  const pick = (row: { key: string; name: string }) => {
    const source = SOURCES.find((s) => s.key === row.key);
    if (source?.attach) {
      setAttachments((current) => [...current, "asset.svg"]);
      if (token) setDraft(draft.slice(0, token.start));
    } else if (menu === "at") {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };

  const canSend = draft.trim().length > 0 || attachments.length > 0;
  const send = () => {
    if (isGenerating) {
      onStopGenerating?.();
      return;
    }
    if (!canSend) return;
    onSend?.(draft.trim(), currentModel.id, isPlanMode);
    setDraft("");
    setAttachments([]);
    closeMenus();
  };

  return (
    <div data-promptbar className="w-full">
      <div ref={composerAnchorRef} className="relative">
        {/* @ / slash menu */}
        {menu && (
          <div
            onMouseLeave={() => setEngaged(false)}
            className="absolute inset-x-0 bottom-full z-50 mb-2 rounded-[10px] bg-[#121214] p-1 shadow-raised border border-[#27272a] backdrop-blur-md"
            style={{ animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom center" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: rowBox?.top ?? 0,
                height: rowBox?.height ?? 0,
                opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
                transition: "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            {rows.map((row, i) => {
              const source = menu === "at" ? SOURCES.find((s) => s.key === row.key) : undefined;
              return (
                <button
                  key={row.key}
                  type="button"
                  ref={(el) => { rowRefs.current[i] = el; }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => {
                    setActive(i);
                    setEngaged(true);
                  }}
                  onClick={() => pick(row)}
                  className="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2 text-left hover:text-white cursor-pointer"
                >
                  {source && (
                    <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                      <Icon size={15}>{GLYPHS[source.glyph ?? "clip"]}</Icon>
                    </span>
                  )}
                  <span className="shrink-0 text-[12.5px] font-mono font-medium text-ink">
                    {row.name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{row.desc}</span>
                </button>
              );
            })}
            {rows.length === 0 && (
              <div className="flex h-9 items-center px-2 text-[12px] text-ink-3">
                No matches for “{query}”
              </div>
            )}
            <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-[11px] text-ink-3">
              {menu === "at" ? "Type to search Manim sources & tokens" : "Type to search slash commands"}
            </div>
          </div>
        )}

        {/* Model CLI Menu */}
        {modelOpen && (
          <div
            onMouseLeave={() => setModelHovered(null)}
            className="absolute z-50 w-56 rounded-[10px] bg-[#121214] p-1 shadow-raised border border-[#27272a] backdrop-blur-md"
            style={{ left: modelMenuLeft, bottom: modelMenuBottom, animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both", transformOrigin: "bottom left" }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: modelBox?.top ?? 0,
                height: modelBox?.height ?? 0,
                opacity: modelBox && modelHovered !== null ? 1 : 0,
                transition: "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            {modelsList.map((m, i) => (
              <button
                key={m.id}
                type="button"
                ref={(el) => { modelRowRefs.current[i] = el; }}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setModelHovered(i)}
                onClick={() => {
                  selectModel(m);
                  inputRef.current?.focus();
                }}
                className="relative z-10 flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left cursor-pointer"
              >
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: m.installed ? "#34d399" : "#71717a" }} />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-medium text-ink">{m.command}</span>
                <span className="shrink-0 text-[10px] text-ink-3 font-mono">
                  {m.installed ? "Ready" : "Missing"}
                </span>
                <span className={`shrink-0 text-ink ${m.id === currentModel.id ? "" : "invisible"}`}>
                  <Icon size={12} strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></Icon>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Composer Main Box */}
        <div
          className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-card transition-[border-color,border-radius] duration-150 focus-within:border-line-strong ${
            tall ? "gap-2.5 p-3" : "gap-1.5 p-1.5"
          } ${
            pill ? (attachments.length > 0 || wide ? "rounded-[24px]" : "rounded-full") : tall ? "rounded-[22px]" : "rounded-[14px]"
          }`}
        >
          <canvas
            ref={glimmRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
            style={{ borderRadius: "inherit" }}
          />
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-[18px]"
          >
            {draft}
          </span>

          {attachments.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 pt-0.5 ${pill ? "px-1" : "px-0.5"}`}>
              {attachments.map((file, i) => (
                <span
                  key={`${file}-${i}`}
                  className={`flex h-6.5 items-center gap-1.5 bg-field py-1 pr-1 pl-1.5 text-[11.5px] text-ink-2 shadow-hairline ${
                    pill ? "rounded-full" : "rounded-chip"
                  }`}
                  style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
                >
                  <Icon size={12}><g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></g></Icon>
                  <span className="max-w-36 truncate">{file}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file}`}
                    onClick={() => setAttachments((current) => current.filter((_, j) => j !== i))}
                    className={`-my-1 flex size-6 items-center justify-center text-ink-3 transition-colors duration-100 hover:bg-line/70 hover:text-ink cursor-pointer ${
                      pill ? "rounded-full" : "rounded-[5px]"
                    }`}
                  >
                    <Icon size={10} strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></Icon>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            ref={controlsRef}
            className={`grid items-end gap-x-1.5 gap-y-1.5 ${
              wide
                ? "grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]"
                : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"
            }`}
          >
            <button
              type="button"
              aria-label="Add attachments and sources"
              aria-expanded={plusOpen}
              onClick={() => {
                setModelOpen(false);
                setPlusOpen((current) => !current);
                inputRef.current?.focus();
              }}
              className={`flex size-7 shrink-0 items-center justify-center justify-self-start text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] cursor-pointer ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${plusOpen ? "bg-hover text-ink" : ""} ${wide ? "col-start-1 row-start-2" : "col-start-1 row-start-1"}`}
            >
              <Icon size={16} strokeWidth={2}><path d="M12 5v14M5 12h14" /></Icon>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setDismissed(false);
                setPlusOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Tab" && !menu) {
                  event.preventDefault();
                  setIsPlanMode((prev) => !prev);
                  return;
                }
                if (menu && rows.length > 0) {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setEngaged(true);
                    setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
                    return;
                  }
                  if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                    event.preventDefault();
                    pick(rows[active]);
                    return;
                  }
                }
                if (event.key === "Escape") {
                  setDismissed(true);
                  closeMenus();
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={
                listening
                  ? "Listening…"
                  : placeholder ?? (isPlanMode ? "Plan: Describe animation goal and architecture..." : `Ask ${currentModel.command} CLI to animate or edit Manim code...`)
              }
              aria-label="Prompt"
              className={`${tall ? "min-h-[64px] px-2 py-2 text-[13.5px] leading-5" : "min-h-7 px-1.5 py-[5px] text-[13px] leading-[18px]"} min-w-0 w-full resize-none bg-transparent text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${
                wide ? "col-span-full col-start-1 row-start-1" : "col-start-2 row-start-1"
              }`}
            />

            {/* Model CLI & Mode Picker */}
            <button
              ref={modelRef}
              type="button"
              aria-expanded={modelOpen}
              aria-label="Choose model"
              onClick={() => {
                setPlusOpen(false);
                setModelOpen((current) => !current);
              }}
              className={`flex h-7 shrink-0 items-center gap-1.5 px-2 text-[11.5px] font-mono font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink cursor-pointer bg-field border border-line ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${wide ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"}`}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: currentModel.installed ? "#34d399" : "#71717a" }} />
              <span>{currentModel.command}</span>
              {isPlanMode && (
                <span className="rounded bg-white/10 px-1 py-0.2 text-[9.5px] text-white font-sans">Plan</span>
              )}
              <span className="text-ink-3">
                <Icon size={11} strokeWidth={2.4}><path d="M6 9l6 6 6-6" /></Icon>
              </span>
            </button>

            {/* Dictation */}
            <button
              type="button"
              aria-label={listening ? "Stop dictation" : "Start dictation"}
              aria-pressed={listening}
              onClick={() => setListening((current) => !current)}
              className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-150 active:scale-[0.94] cursor-pointer ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${listening ? "bg-white text-black" : "text-ink-3 hover:bg-hover hover:text-ink"} ${wide ? "col-start-4 row-start-2" : "col-start-4 row-start-1"}`}
            >
              {listening ? (
                <span className="flex h-3.5 items-center gap-[2.5px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-current"
                      style={{ height: "100%", animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
                    />
                  ))}
                </span>
              ) : (
                <Icon size={15} strokeWidth={2}><g><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></g></Icon>
              )}
            </button>

            {/* Send Button */}
            <button
              type="button"
              aria-label={isGenerating ? "Stop" : "Send"}
              disabled={!isGenerating && !canSend}
              onClick={send}
              className={`flex size-7 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.94] cursor-pointer ${
                pill ? "rounded-full" : "rounded-[8px]"
              } ${wide ? "col-start-5 row-start-2" : "col-start-5 row-start-1"}`}
              style={{
                background: isGenerating ? "#ef4444" : canSend ? "var(--ink)" : "var(--line-strong)",
                color: isGenerating ? "#ffffff" : canSend ? "var(--surface)" : "var(--ink-2)",
              }}
            >
              {isGenerating ? (
                <Icon size={12} strokeWidth={2.4}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></Icon>
              ) : (
                <Icon size={16} strokeWidth={2.4}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptBar;
