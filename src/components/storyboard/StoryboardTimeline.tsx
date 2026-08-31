"use client";

import React, { useState } from "react";
import { Film, Plus, Play, Trash2, CheckCircle2, Video, Layers, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SceneItem {
  id: string;
  name: string;
  duration: string;
  status: "ready" | "rendering" | "draft";
  description: string;
}

export interface StoryboardTimelineProps {
  scenes: SceneItem[];
  selectedSceneId: string;
  onSelectScene: (id: string) => void;
  onAddScene: () => void;
  onRenderAll?: () => void;
  renderQuality: "480p" | "720p" | "1080p" | "4k";
  onQualityChange: (quality: "480p" | "720p" | "1080p" | "4k") => void;
  className?: string;
}

export function StoryboardTimeline({
  scenes,
  selectedSceneId,
  onSelectScene,
  onAddScene,
  onRenderAll,
  renderQuality,
  onQualityChange,
  className,
}: StoryboardTimelineProps) {
  return (
    <div className={cn("flex flex-col bg-[#121214] text-white p-4 space-y-4 overflow-y-auto", className)}>
      {/* Header with Quality Switcher */}
      <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Film className="size-4 text-white" />
          <span>Storyboard & Multi-Scene Director</span>
        </div>

        {/* Quality preset buttons */}
        <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
          {(["480p", "720p", "1080p", "4k"] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQualityChange(q)}
              className={cn(
                "rounded px-2 py-0.5 text-[10.5px] font-mono transition-colors",
                renderQuality === q ? "bg-white text-black font-bold" : "text-[#71717a] hover:text-white"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Scenes List Filmstrip */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
          <span>Animation Sequences ({scenes.length})</span>
          <button
            type="button"
            onClick={onAddScene}
            className="flex items-center gap-1 text-white hover:underline text-[11px] font-bold"
          >
            <Plus className="size-3" />
            <span>Add Scene</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {scenes.map((scene, idx) => {
            const isSelected = scene.id === selectedSceneId;
            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene.id)}
                className={cn(
                  "group relative flex items-start gap-3 rounded-xl p-3 border transition-all cursor-pointer",
                  isSelected
                    ? "bg-[#18181b] border-white shadow-card"
                    : "bg-[#09090b] border-[#27272a] hover:bg-[#18181b]"
                )}
              >
                <span className={cn(
                  "grid size-6 place-items-center rounded-lg text-xs font-mono font-bold shrink-0",
                  isSelected ? "bg-white text-black" : "bg-[#18181b] text-[#71717a]"
                )}>
                  {idx + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white truncate">{scene.name}</span>
                    <span className="font-mono text-[10.5px] text-[#71717a]">{scene.duration}</span>
                  </div>
                  <p className="text-[11px] text-[#a1a1aa] truncate mt-0.5">{scene.description}</p>
                </div>

                {isSelected && (
                  <span className="size-2 rounded-full bg-white shrink-0 self-center" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Concatenate / Render Full Lecture */}
      {onRenderAll && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onRenderAll}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 px-4 text-xs font-bold text-black transition-all hover:bg-[#e4e4e7] shadow-sm"
          >
            <Layers className="size-4" />
            <span>Render Complete Master Video (FFmpeg Stitch)</span>
          </button>
        </div>
      )}
    </div>
  );
}
