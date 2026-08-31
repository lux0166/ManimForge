"use client";

import React, { useMemo } from "react";
import { Flag, Play, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnimationKeyframe {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  type: "play" | "wait";
}

export interface KeyframeTimelineProps {
  code: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
}

export const KeyframeTimeline = React.memo(function KeyframeTimeline({
  code,
  currentTime,
  duration,
  onSeek,
  className,
}: KeyframeTimelineProps) {
  const keyframes = useMemo<AnimationKeyframe[]>(() => {
    if (!code) return [];
    const lines = code.split("\n");
    const result: AnimationKeyframe[] = [];
    let cumulativeTime = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const playMatch = line.match(/self\.play\((.*)\)/);
      if (playMatch) {
        const body = playMatch[1];
        const runtimeMatch = body.match(/run_time\s*=\s*([0-9.]+)/);
        const animDuration = runtimeMatch ? parseFloat(runtimeMatch[1]) : 1.0;

        const animNameMatch = body.match(/([A-Za-z0-9_]+)\s*\(/);
        const name = animNameMatch ? animNameMatch[1] : "Animation";

        result.push({
          id: `play_${i}`,
          name: `${name}()`,
          startTime: cumulativeTime,
          duration: animDuration,
          type: "play",
        });
        cumulativeTime += animDuration;
        continue;
      }

      const waitMatch = line.match(/self\.wait\(([0-9.]*)\)/);
      if (waitMatch) {
        const waitDuration = waitMatch[1] ? parseFloat(waitMatch[1]) : 1.0;
        result.push({
          id: `wait_${i}`,
          name: `Wait(${waitDuration}s)`,
          startTime: cumulativeTime,
          duration: waitDuration,
          type: "wait",
        });
        cumulativeTime += waitDuration;
      }
    }

    return result;
  }, [code]);

  const totalDuration = duration || (keyframes.length > 0 ? keyframes[keyframes.length - 1].startTime + keyframes[keyframes.length - 1].duration : 5);

  return (
    <div className={cn("flex flex-col bg-[#121214] border-t border-[#27272a] px-3 py-2 text-white select-none", className)}>
      <div className="flex items-center justify-between pb-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-emerald-400" />
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
            Animation Keyframe Scrubber
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#71717a]">
          <span className="text-white font-semibold">{currentTime.toFixed(1)}s</span> / {totalDuration.toFixed(1)}s
        </div>
      </div>

      <div
        className="relative h-6 w-full rounded bg-[#18181b] border border-[#27272a] flex items-center px-1 overflow-hidden cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          onSeek(ratio * totalDuration);
        }}
      >
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-20 transition-all duration-75 shadow-[0_0_8px_#34d399]"
          style={{ left: `${(currentTime / (totalDuration || 1)) * 100}%` }}
        />

        {keyframes.map((kf) => {
          const leftPercent = (kf.startTime / totalDuration) * 100;
          const widthPercent = (kf.duration / totalDuration) * 100;
          const isCurrent = currentTime >= kf.startTime && currentTime < kf.startTime + kf.duration;

          return (
            <div
              key={kf.id}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(kf.startTime);
              }}
              style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 4)}%` }}
              className={cn(
                "absolute top-1 bottom-1 rounded px-1 flex items-center justify-center text-[9.5px] font-mono truncate transition-all cursor-pointer border",
                isCurrent
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                  : kf.type === "play"
                  ? "bg-white/5 border-white/10 text-[#a1a1aa] hover:bg-white/10 hover:text-white"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-300/70"
              )}
              title={`${kf.name} @ ${kf.startTime.toFixed(1)}s (${kf.duration}s)`}
            >
              <span className="truncate">{kf.name}</span>
            </div>
          );
        })}
      </div>

      {keyframes.length > 0 && (
        <div className="flex items-center gap-1.5 pt-2 overflow-x-auto no-scrollbar">
          {keyframes.map((kf) => (
            <button
              key={kf.id}
              type="button"
              onClick={() => onSeek(kf.startTime)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors cursor-pointer border",
                currentTime >= kf.startTime && currentTime < kf.startTime + kf.duration
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : "bg-[#18181b] border-[#27272a] text-[#71717a] hover:text-white"
              )}
            >
              <Flag className="size-2.5 text-emerald-400" />
              <span>{kf.name}</span>
              <span className="text-[9px] text-[#52525b]">({kf.startTime.toFixed(1)}s)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
