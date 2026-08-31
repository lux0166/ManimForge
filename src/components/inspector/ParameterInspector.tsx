"use client";

import React, { useMemo } from "react";
import { Sliders, Palette, Type, Sparkles, Hash, ToggleLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParsedParam {
  name: string;
  type: "color" | "number" | "string" | "boolean";
  value: any;
  rawLine: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface ParameterInspectorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  onTriggerRender?: () => void;
  className?: string;
}

export const THEME_PRESETS = [
  {
    name: "Catppuccin Mocha",
    colors: {
      COLOR_INPUT: "#89b4fa",
      COLOR_WEIGHT: "#f9e2af",
      COLOR_OUTPUT: "#a6e3a1",
      COLOR_TARGET: "#f38ba8",
      COLOR_TEXT: "#cdd6f4",
    },
  },
  {
    name: "3Blue1Brown Classic",
    colors: {
      COLOR_INPUT: "#58c4dd",
      COLOR_WEIGHT: "#ffff00",
      COLOR_OUTPUT: "#83c167",
      COLOR_TARGET: "#fc6255",
      COLOR_TEXT: "#ffffff",
    },
  },
  {
    name: "Dracula Neon",
    colors: {
      COLOR_INPUT: "#8be9fd",
      COLOR_WEIGHT: "#f1fa8c",
      COLOR_OUTPUT: "#50fa7b",
      COLOR_TARGET: "#ff79c6",
      COLOR_TEXT: "#f8f8f2",
    },
  },
  {
    name: "TokyoNight Storm",
    colors: {
      COLOR_INPUT: "#7aa2f7",
      COLOR_WEIGHT: "#e0af68",
      COLOR_OUTPUT: "#9ece6a",
      COLOR_TARGET: "#f7768e",
      COLOR_TEXT: "#c0caf5",
    },
  },
  {
    name: "Cyberpunk Glow",
    colors: {
      COLOR_INPUT: "#00f0ff",
      COLOR_WEIGHT: "#ffe600",
      COLOR_OUTPUT: "#00ff66",
      COLOR_TARGET: "#ff003c",
      COLOR_TEXT: "#fcee0a",
    },
  },
];

export function ParameterInspector({
  code,
  onCodeChange,
  onTriggerRender,
  className,
}: ParameterInspectorProps) {
  // Parse top-level constants: CONST_NAME = value
  const params: ParsedParam[] = useMemo(() => {
    const lines = code.split("\n");
    const result: ParsedParam[] = [];

    const constRegex = /^([A-Z0-9_]+)\s*=\s*(.+)$/;

    for (const line of lines) {
      const match = line.trim().match(constRegex);
      if (!match) continue;

      const name = match[1];
      const valStr = match[2].split("#")[0].trim(); // strip comments

      if (name.startsWith("COLOR_") || (valStr.startsWith('"#') && valStr.endsWith('"')) || (valStr.startsWith("'#") && valStr.endsWith("'"))) {
        const hex = valStr.replace(/['"]/g, "");
        result.push({ name, type: "color", value: hex, rawLine: line });
      } else if (!isNaN(Number(valStr))) {
        const num = Number(valStr);
        let min = 0;
        let max = 10;
        let step = 0.1;
        if (num <= 1 && num >= 0) {
          min = 0;
          max = 1;
          step = 0.05;
        } else if (num > 10) {
          min = 0;
          max = num * 2;
          step = 1;
        }
        result.push({ name, type: "number", value: num, rawLine: line, min, max, step });
      } else if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
        const str = valStr.slice(1, -1);
        result.push({ name, type: "string", value: str, rawLine: line });
      } else if (valStr === "True" || valStr === "False") {
        result.push({ name, type: "boolean", value: valStr === "True", rawLine: line });
      }
    }

    return result;
  }, [code]);

  const updateParam = (paramName: string, newValue: any, type: string) => {
    const lines = code.split("\n");
    const updated = lines.map((line) => {
      const match = line.trim().match(new RegExp(`^${paramName}\\s*=.*$`));
      if (!match) return line;

      let formattedVal = newValue;
      if (type === "color" || type === "string") {
        formattedVal = `"${newValue}"`;
      } else if (type === "boolean") {
        formattedVal = newValue ? "True" : "False";
      }

      // Preserve trailing comments if any
      const commentPart = line.includes("#") ? "  #" + line.split("#").slice(1).join("#") : "";
      return `${paramName} = ${formattedVal}${commentPart}`;
    });

    onCodeChange(updated.join("\n"));
  };

  const applyTheme = (preset: typeof THEME_PRESETS[0]) => {
    let newCode = code;
    for (const [key, color] of Object.entries(preset.colors)) {
      const reg = new RegExp(`^${key}\\s*=.*$`, "m");
      if (newCode.match(reg)) {
        newCode = newCode.replace(reg, `${key} = "${color}"`);
      }
    }
    // update THEME token if present
    if (newCode.match(/^THEME\s*=/m)) {
      newCode = newCode.replace(/^THEME\s*=.*$/m, `THEME = "${preset.name}"`);
    }
    onCodeChange(newCode);
    onTriggerRender?.();
  };

  return (
    <div className={cn("flex h-full flex-col bg-[var(--surface)] p-4 text-[var(--ink)] overflow-y-auto space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Sliders className="size-4 text-[var(--accent)]" />
          <span>Live Parameter Inspector</span>
        </div>
        {onTriggerRender && (
          <button
            type="button"
            onClick={onTriggerRender}
            className="flex items-center gap-1 text-[11px] text-[var(--accent-hover)] hover:text-white transition-colors"
          >
            <RefreshCw className="size-3" />
            <span>Apply & Render</span>
          </button>
        )}
      </div>

      {/* Theme Presets */}
      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--ink-3)]">
          Academic Theme Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyTheme(preset)}
              className="flex items-center justify-between rounded-xl bg-[var(--field)] p-2.5 text-xs text-left hover:bg-[var(--line)] border border-[var(--line)] transition-all shadow-hairline group"
            >
              <span className="font-medium text-[var(--ink)] truncate group-hover:text-[var(--accent)]">{preset.name}</span>
              <div className="flex -space-x-1 shrink-0 ml-1">
                {Object.values(preset.colors).slice(0, 3).map((c, i) => (
                  <span key={i} className="size-3 rounded-full border border-black/40 shadow-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color Tokens */}
      {params.filter((p) => p.type === "color").length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-3)]">
            <Palette className="size-3 text-[var(--accent)]" />
            <span>Color Tokens</span>
          </div>
          <div className="space-y-2">
            {params.filter((p) => p.type === "color").map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-xl bg-[var(--field)] px-3 py-2 border border-[var(--line)] shadow-hairline">
                <span className="font-mono text-xs text-[var(--ink-2)] truncate max-w-[140px]">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--ink-3)]">{p.value}</span>
                  <input
                    type="color"
                    value={p.value}
                    onChange={(e) => updateParam(p.name, e.target.value, "color")}
                    className="size-6 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numeric Sliders */}
      {params.filter((p) => p.type === "number").length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-3)]">
            <Hash className="size-3 text-[#22c55e]" />
            <span>Numeric Parameters</span>
          </div>
          <div className="space-y-2.5">
            {params.filter((p) => p.type === "number").map((p) => (
              <div key={p.name} className="rounded-xl bg-[var(--field)] p-3 border border-[var(--line)] shadow-hairline space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[var(--ink-2)]">{p.name}</span>
                  <span className="font-mono text-[var(--accent)] font-semibold">{p.value}</span>
                </div>
                <input
                  type="range"
                  min={p.min ?? 0}
                  max={p.max ?? 10}
                  step={p.step ?? 0.1}
                  value={p.value}
                  onChange={(e) => updateParam(p.name, Number(e.target.value), "number")}
                  className="w-full h-1.5 rounded-lg appearance-none bg-[var(--line)] cursor-pointer accent-[var(--accent)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Strings */}
      {params.filter((p) => p.type === "string").length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-3)]">
            <Type className="size-3 text-[#f59e0b]" />
            <span>Text & Labels</span>
          </div>
          <div className="space-y-2">
            {params.filter((p) => p.type === "string").map((p) => (
              <div key={p.name} className="rounded-xl bg-[var(--field)] p-2.5 border border-[var(--line)] shadow-hairline space-y-1">
                <span className="font-mono text-[11px] text-[var(--ink-3)]">{p.name}</span>
                <input
                  type="text"
                  value={p.value}
                  onChange={(e) => updateParam(p.name, e.target.value, "string")}
                  className="w-full rounded-lg bg-[var(--surface)] border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
