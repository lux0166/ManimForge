"use client";

import React, { useMemo, useState } from "react";
import { LayoutGrid, Play, Film, Layers, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StoryboardScene {
  id: string;
  name: string;
  lineStart: number;
  duration: number;
  description: string;
}

export interface StoryboardPanelProps {
  code: string;
  onRenderScene: (sceneName: string) => void;
  onMergeMaster: () => void;
  className?: string;
}

export function StoryboardPanel({
  code,
  onRenderScene,
  onMergeMaster,
  className,
}: StoryboardPanelProps) {
  const [isMerging, setIsMerging] = useState(false);

  const scenes = useMemo<StoryboardScene[]>(() => {
    if (!code) return [];
    const lines = code.split("\n");
    const result: StoryboardScene[] = [];

    const sceneRegex = /^class\s+([A-Za-z0-9_]+)\s*\(\s*Scene\s*\):/;

    lines.forEach((line, idx) => {
      const match = line.trim().match(sceneRegex);
      if (match) {
        const name = match[1];
        result.push({
          id: `scene_${idx}`,
          name,
          lineStart: idx + 1,
          duration: 3.5,
          description: `Mathematical animation sequence defined in ${name}.`,
        });
      }
    });

    if (result.length === 0) {
      result.push({
        id: "scene_default",
        name: "Scene",
        lineStart: 1,
        duration: 4.0,
        description: "Primary mathematical animation sequence.",
      });
    }

    return result;
  }, [code]);

  return (
    <div className={cn("flex flex-col h-full bg-[#0d0d0f] text-white p-4 overflow-y-auto space-y-4", className)}>
      <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-purple-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white">
            Multi-Scene Storyboard
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1f1f23] text-[#a1a1aa] border border-[#27272a]">
            {scenes.length} Scenes
          </span>
        </div>

        <button
          type="button"
          onClick={async () => {
            setIsMerging(true);
            await onMergeMaster();
            setIsMerging(false);
          }}
          disabled={isMerging}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {isMerging ? <RefreshCw className="size-3 animate-spin" /> : <Film className="size-3" />}
          <span>Merge Master Video</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenes.map((scene, idx) => (
          <div
            key={scene.id}
            className="group relative flex flex-col justify-between rounded-xl bg-[#141417] border border-[#27272a] p-3 hover:border-purple-500/50 transition-all space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-400 border border-purple-500/30">
                  {idx + 1}
                </span>
                <span className="font-mono text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {scene.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#71717a]">Line {scene.lineStart}</span>
            </div>

            <div className="relative h-24 w-full rounded-lg bg-black/60 border border-[#27272a] flex items-center justify-center overflow-hidden">
              <Layers className="size-6 text-[#3f3f46] group-hover:scale-110 transition-transform" />
              <button
                type="button"
                onClick={() => onRenderScene(scene.name)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-black text-xs font-medium shadow-lg hover:scale-105 transition-transform">
                  <Play className="size-3 fill-black" />
                  <span>Preview Scene</span>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#71717a]">
              <span>{scene.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
