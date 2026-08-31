"use client";

import React, { useRef, useState } from "react";
import { Plus, Sparkles, Video, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarProjectItem {
  id: string;
  label: string;
  prompt?: string;
}

export interface AppSidebarProps {
  items: SidebarProjectItem[];
  selectedId: string;
  onSelect: (item: SidebarProjectItem) => void;
  onNewVideo: () => void;
  className?: string;
}

export function AppSidebar({
  items,
  selectedId,
  onSelect,
  onNewVideo,
  className,
}: AppSidebarProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0,
  });
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleMouseEnter = (index: number) => {
    setHoverIndex(index);
    const target = itemRefs.current[index];
    if (target && listRef.current) {
      const targetRect = target.getBoundingClientRect();
      const listRect = listRef.current.getBoundingClientRect();
      setIndicatorStyle({
        top: targetRect.top - listRect.top,
        height: targetRect.height,
        opacity: 1,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <aside className={cn("flex h-full w-[240px] shrink-0 flex-col bg-[#09090b] border-r border-[#27272a] text-white select-none", className)}>
      {/* Exact h-11 Header (44px) matching Chat & Preview columns */}
      <div className="flex h-11 shrink-0 items-center justify-between px-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-white" />
          <span className="font-semibold text-xs text-white tracking-tight">ManimForge</span>
        </div>
        <span className="text-[10px] font-mono text-[#71717a]">v0.21</span>
      </div>

      {/* New Video Button */}
      <div className="p-2 border-b border-[#27272a]/60">
        <button
          type="button"
          onClick={onNewVideo}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white py-1.5 px-3 text-xs font-semibold text-black transition-all hover:bg-[#e4e4e7] active:scale-[0.98] shadow-sm"
        >
          <Plus className="size-3.5" />
          <span>New Video</span>
        </button>
      </div>

      {/* Projects List */}
      <div
        ref={listRef}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 overflow-y-auto px-1.5 space-y-0.5 py-1.5"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1.5 rounded-md bg-white/5 transition-all duration-150 ease-out"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
          }}
        />

        {items.map((item, index) => {
          const isActive = item.id === selectedId;
          return (
            <button
              key={item.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              type="button"
              onMouseEnter={() => handleMouseEnter(index)}
              onClick={() => onSelect(item)}
              className={cn(
                "relative z-10 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                isActive
                  ? "bg-[#18181b] text-white font-medium border border-[#27272a]"
                  : "text-[#a1a1aa] hover:text-white"
              )}
            >
              <Video className={cn("size-3.5 shrink-0", isActive ? "text-white" : "text-[#71717a]")} />
              <span className="truncate flex-1">{item.label}</span>
              {isActive && (
                <span className="size-1 rounded-full bg-white shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
