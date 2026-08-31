"use client";

import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StudioLayoutProps {
  sidebarSlot: ReactNode;
  chatSlot: ReactNode;
  previewSlot: ReactNode;
  editorSlot: ReactNode;
  className?: string;
}

export function StudioLayout({
  sidebarSlot,
  chatSlot,
  previewSlot,
  editorSlot,
  className,
}: StudioLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--page)] text-[var(--ink)] antialiased">
      {/* Left Sidebar */}
      {sidebarSlot}

      {/* Center Panel (Chat Assistant) */}
      <div className="flex flex-1 min-w-[340px] max-w-[46%] h-full flex-col">
        {chatSlot}
      </div>

      {/* Right Split Panel (Top: Preview / Bottom: Code Editor) */}
      <div className="flex flex-1 min-w-[380px] h-full flex-col">
        <div className="h-[52%] min-h-0">
          {previewSlot}
        </div>
        <div className="h-[48%] min-h-0">
          {editorSlot}
        </div>
      </div>
    </div>
  );
}
