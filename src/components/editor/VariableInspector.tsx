"use client";

import React, { useMemo, useCallback } from "react";
import { Sliders, RefreshCw, Sparkles, Hash, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParsedParam {
  name: string;
  value: number | string;
  type: "number" | "color" | "text";
  min: number;
  max: number;
  step: number;
  label: string;
  rawLine: string;
}

export interface VariableInspectorProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  onReRender?: () => void;
  className?: string;
}

export const VariableInspector = React.memo(function VariableInspector({
  code,
  onChangeCode,
  onReRender,
  className,
}: VariableInspectorProps) {
  const params = useMemo<ParsedParam[]>(() => {
    if (!code) return [];
    const lines = code.split("\n");
    const result: ParsedParam[] = [];

    const paramRegex = /^([A-Za-z0-9_]+)\s*=\s*([^#]+)#\s*@param\s*(.*)$/;

    for (const line of lines) {
      const match = line.trim().match(paramRegex);
      if (match) {
        const name = match[1].trim();
        let rawVal = match[2].trim();
        const metaStr = match[3].trim();

        const minMatch = metaStr.match(/min=([0-9.-]+)/);
        const maxMatch = metaStr.match(/max=([0-9.-]+)/);
        const stepMatch = metaStr.match(/step=([0-9.-]+)/);
        const labelMatch = metaStr.match(/label=["']([^"']+)["']/);
        const typeMatch = metaStr.match(/type=([a-z]+)/);

        let type: "number" | "color" | "text" = "number";
        if (typeMatch) {
          type = typeMatch[1] as "number" | "color" | "text";
        } else if (rawVal.startsWith('"') || rawVal.startsWith("'")) {
          type = rawVal.includes("#") ? "color" : "text";
        }

        let val: number | string = rawVal.replace(/['"]/g, "");
        if (type === "number") {
          val = parseFloat(val) || 0;
        }

        result.push({
          name,
          value: val,
          type,
          min: minMatch ? parseFloat(minMatch[1]) : 0,
          max: maxMatch ? parseFloat(maxMatch[1]) : 10,
          step: stepMatch ? parseFloat(stepMatch[1]) : 0.1,
          label: labelMatch ? labelMatch[1] : name,
          rawLine: line,
        });
      }
    }
    return result;
  }, [code]);

  const handleUpdateParam = useCallback(
    (param: ParsedParam, newVal: number | string) => {
      const lines = code.split("\n");
      const updatedLines = lines.map((line) => {
        const regex = new RegExp(`^${param.name}\\s*=\\s*([^#]+)(#\\s*@param.*)$`);
        if (regex.test(line.trim())) {
          const formattedVal = param.type === "number" ? newVal : `"${newVal}"`;
          return line.replace(regex, `${param.name} = ${formattedVal} $2`);
        }
        return line;
      });

      const newCode = updatedLines.join("\n");
      onChangeCode(newCode);
    },
    [code, onChangeCode]
  );

  return (
    <div className={cn("flex flex-col h-full bg-[#0d0d0f] text-white p-4 overflow-y-auto space-y-4", className)}>
      <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white">
            Interactive Parameter Controls
          </span>
        </div>
        {onReRender && (
          <button
            type="button"
            onClick={onReRender}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-xs text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3" />
            <span>Update Scene</span>
          </button>
        )}
      </div>

      {params.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-[#71717a] space-y-2">
          <Sparkles className="size-8 text-[#3f3f46] animate-pulse" />
          <p className="text-xs font-medium text-[#a1a1aa]">No configurable parameters detected</p>
          <p className="text-[11px] max-w-xs text-[#71717a]">
            Add <code className="text-emerald-400 font-mono"># @param min=1 max=5 label="..."</code> next to any variable in your Python code to create interactive sliders here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {params.map((param) => (
            <div
              key={param.name}
              className="p-3 rounded-lg bg-[#141417] border border-[#27272a] hover:border-[#3f3f46] transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {param.type === "number" ? (
                    <Hash className="size-3.5 text-blue-400" />
                  ) : param.type === "color" ? (
                    <Palette className="size-3.5 text-pink-400" />
                  ) : (
                    <Sliders className="size-3.5 text-amber-400" />
                  )}
                  <span className="text-xs font-medium text-white">{param.label}</span>
                  <span className="text-[10px] font-mono text-[#71717a]">({param.name})</span>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#1f1f23] text-emerald-400 border border-[#27272a]">
                  {param.value}
                </span>
              </div>

              {param.type === "number" && (
                <div className="space-y-1">
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={Number(param.value)}
                    onChange={(e) => handleUpdateParam(param, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
                    <span>{param.min}</span>
                    <span>{param.max}</span>
                  </div>
                </div>
              )}

              {param.type === "color" && (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="color"
                    value={String(param.value)}
                    onChange={(e) => handleUpdateParam(param, e.target.value)}
                    className="size-7 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={String(param.value)}
                    onChange={(e) => handleUpdateParam(param, e.target.value)}
                    className="font-mono text-xs bg-[#1f1f23] border border-[#27272a] rounded px-2 py-1 text-white w-24 outline-none focus:border-white/30"
                  />
                </div>
              )}

              {param.type === "text" && (
                <input
                  type="text"
                  value={String(param.value)}
                  onChange={(e) => handleUpdateParam(param, e.target.value)}
                  className="w-full text-xs bg-[#1f1f23] border border-[#27272a] rounded px-2.5 py-1.5 text-white outline-none focus:border-white/30"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
