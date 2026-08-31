"use client";

import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Check, Copy, Maximize2, Minimize2, Play, FileCode2, Sliders } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/motion/tabs";
import { VariableInspector } from "@/components/editor/VariableInspector";
import { cn } from "@/lib/utils";

export interface CodeEditorPanelProps {
  code: string;
  onChange: (newCode: string) => void;
  onRun?: () => void;
  activeThemeName?: string;
  className?: string;
}

export const CodeEditorPanel = React.memo(function CodeEditorPanel({
  code,
  onChange,
  onRun,
  activeThemeName = "Catppuccin Mocha",
  className,
}: CodeEditorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("code");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-[#121214] overflow-hidden transition-all text-white",
        fullscreen ? "fixed inset-0 z-50 bg-black" : "relative",
        className
      )}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        {/* Exact h-11 Header (44px) */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#27272a] px-3 bg-[#09090b]">
          <div className="flex items-center gap-2">
            <TabsList className="h-7 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a]">
              <TabsTrigger value="code" className="text-xs px-2.5 py-0.5 gap-1 rounded-md text-[#a1a1aa] data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:font-semibold">
                <FileCode2 className="size-3" />
                <span>scene.py</span>
              </TabsTrigger>
              <TabsTrigger value="inspector" className="text-xs px-2.5 py-0.5 gap-1 rounded-md text-[#a1a1aa] data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:font-semibold">
                <Sliders className="size-3" />
                <span>Variables</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2">
            {onRun && (
              <button
                type="button"
                onClick={onRun}
                className="flex items-center gap-1.5 rounded-lg bg-white text-black px-2.5 py-1 text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-sm active:scale-95"
                title="Re-render Scene (Ctrl+S)"
              >
                <Play className="size-3 fill-current" />
                <span>Run</span>
                <kbd className="hidden sm:inline font-mono text-[9px] bg-black/10 px-1 py-0.2 rounded text-black/70">Ctrl+S</kbd>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg text-[#a1a1aa] hover:text-white px-2 py-1 text-xs bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] transition-colors"
            >
              {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              className="flex size-7 items-center justify-center rounded-lg text-[#a1a1aa] hover:text-white bg-[#18181b] border border-[#27272a] transition-colors"
            >
              {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* Tab 1: Monaco Code Editor */}
        <TabsContent value="code" className="flex-1 min-h-0 bg-[#09090b] m-0">
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={(val) => onChange(val ?? "")}
            options={{
              fontSize: 13,
              fontFamily: "Fira Code, Cascadia Code, JetBrains Mono, Menlo, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 8,
              lineNumbersMinChars: 3,
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
              overviewRulerBorder: false,
              renderLineHighlight: "line",
              tabSize: 4,
            }}
          />
        </TabsContent>

        {/* Tab 2: Live Parameter Inspector */}
        <TabsContent value="inspector" className="flex-1 min-h-0 m-0 overflow-y-auto">
          <VariableInspector
            code={code}
            onChangeCode={onChange}
            onReRender={onRun}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});
